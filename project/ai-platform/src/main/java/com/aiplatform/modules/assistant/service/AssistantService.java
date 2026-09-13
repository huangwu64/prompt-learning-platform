package com.aiplatform.modules.assistant.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.ai.AiResponse;
import com.aiplatform.ai.AiScope;
import com.aiplatform.ai.ChatMessage;
import com.aiplatform.common.BizException;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.modules.assistant.dto.AssistantChatReq;
import com.aiplatform.modules.assistant.dto.CreateAssistantConvReq;
import com.aiplatform.modules.assistant.mapper.AssistantQueryMapper;
import com.aiplatform.modules.assistant.prompt.AssistantPrompts;
import com.aiplatform.modules.assistant.vo.AssistantConvDetailVO;
import com.aiplatform.modules.assistant.vo.AssistantConversationVO;
import com.aiplatform.modules.chat.entity.Conversation;
import com.aiplatform.modules.chat.entity.Message;
import com.aiplatform.modules.chat.mapper.ConversationMapper;
import com.aiplatform.modules.chat.mapper.MessageMapper;
import com.aiplatform.modules.chat.vo.MessageVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.stream.Collectors;

/**
 * 全局 AI 助手：会话管理 + 流式对话。
 *
 * 与苏格拉底对话共用 conversations/messages 两张表，靠 conversation_type 隔离；
 * 所有查询都必须带该过滤条件，否则助手的长驻 active 会话会阻塞苏格拉底建会话。
 */
@Slf4j
@Service
public class AssistantService {

    private static final String ROLE_USER = "user";
    private static final String ROLE_ASSISTANT = "assistant";
    private static final String MSG_TYPE_CHAT = "chat";
    private static final String STATUS_ACTIVE = "active";

    /** 上下文窗口：最多携带最近多少条历史消息 */
    private static final int CONTEXT_MAX_MESSAGES = 20;
    /** 上下文窗口：历史累计字符上限，超出则从最旧开始丢 */
    private static final int CONTEXT_MAX_CHARS = 12_000;
    /** 会话标题截取长度（取首条用户消息前 N 字） */
    private static final int TITLE_MAX_LEN = 30;
    /** 心跳间隔：防止 nginx / 浏览器把空闲长连接掐掉 */
    private static final long HEARTBEAT_MILLIS = 15_000L;
    /** SSE 连接总超时，与 application.yml 的 spring.mvc.async.request-timeout 对齐 */
    private static final long SSE_TIMEOUT_MILLIS = 180_000L;

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final AssistantQueryMapper assistantQueryMapper;
    private final AiGateway aiGateway;
    private final ThreadPoolExecutor streamExecutor;
    private final ScheduledExecutorService heartbeatScheduler;

    public AssistantService(ConversationMapper conversationMapper,
                            MessageMapper messageMapper,
                            AssistantQueryMapper assistantQueryMapper,
                            AiGateway aiGateway,
                            @Qualifier("assistantStreamExecutor") ThreadPoolExecutor streamExecutor,
                            @Qualifier("assistantHeartbeatScheduler") ScheduledExecutorService heartbeatScheduler) {
        this.conversationMapper = conversationMapper;
        this.messageMapper = messageMapper;
        this.assistantQueryMapper = assistantQueryMapper;
        this.aiGateway = aiGateway;
        this.streamExecutor = streamExecutor;
        this.heartbeatScheduler = heartbeatScheduler;
    }

    // ==================== 会话 ====================

    /** 新建空会话。标题可省略，首条消息时会自动回填 */
    @Transactional
    public AssistantConvDetailVO create(String userId, CreateAssistantConvReq req) {
        Conversation conv = new Conversation();
        conv.setUserId(userId);
        conv.setConversationType(Conversation.TYPE_ASSISTANT);
        conv.setStatus(STATUS_ACTIVE);
        conv.setTitle(req.getTitle() == null || req.getTitle().isBlank() ? null : req.getTitle().trim());
        conv.setCurrentRound(0);
        // 助手无轮次概念，0 表示「不适用」（列是 NOT NULL 所以不能留空）
        conv.setMaxRounds(0);
        conversationMapper.insert(conv);
        log.info("创建助手会话 convId={} userId={}", conv.getId(), userId);
        return new AssistantConvDetailVO(conv.getId(), conv.getTitle(), List.of());
    }

    public PageResult<AssistantConversationVO> list(String userId, PageQuery pq) {
        Page<Conversation> page = new Page<>(pq.getPage(), pq.getPageSize());
        conversationMapper.selectPage(page, new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                .eq(Conversation::getConversationType, Conversation.TYPE_ASSISTANT)
                .orderByDesc(Conversation::getUpdatedAt));

        List<AssistantConversationVO> items = withMessageCount(page.getRecords());
        return PageResult.of(page, items);
    }

    public AssistantConvDetailVO detail(String userId, String conversationId) {
        Conversation conv = requireOwnedAssistant(userId, conversationId);
        List<MessageVO> messages = loadMessages(conv.getId()).stream().map(MessageVO::from).toList();
        return new AssistantConvDetailVO(conv.getId(), conv.getTitle(), messages);
    }

    @Transactional
    public void delete(String userId, String conversationId) {
        Conversation conv = requireOwnedAssistant(userId, conversationId);
        // 先删消息：messages.conversation_id 有外键指向 conversations，顺序不能反
        messageMapper.delete(new LambdaQueryWrapper<Message>()
                .eq(Message::getConversationId, conv.getId()));
        conversationMapper.deleteById(conv.getId());
        log.info("删除助手会话 convId={} userId={}", conversationId, userId);
    }

    // ==================== 对话 ====================

    /** 非流式发消息。供 e2e 测试与流式降级使用 */
    public MessageVO chat(String userId, AssistantChatReq req) {
        Conversation conv = requireOwnedAssistant(userId, req.getConversationId());
        String content = req.getContent().trim();

        persistUserTurn(conv, content);

        AiResponse resp = aiGateway.chatTextDetail(userId, AiScope.ASSISTANT,
                buildContext(conv.getId()), null, null);

        Message assistantMsg = insertMessage(conv.getId(), ROLE_ASSISTANT, resp.content());
        touchConversation(conv.getId());
        return MessageVO.from(assistantMsg);
    }

    /**
     * 流式发消息。返回的 SseEmitter 由 Controller 直接下发。
     *
     * 校验与建 emitter 在**请求线程**完成 —— 这样 400/403/404 还能走正常的
     * JSON 错误响应；只有真正耗时的流式消费才交给线程池。
     */
    public SseEmitter stream(String userId, AssistantChatReq req) {
        Conversation conv = requireOwnedAssistant(userId, req.getConversationId());
        String content = req.getContent().trim();

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT_MILLIS);
        try {
            streamExecutor.execute(() -> runStream(userId, conv, content, emitter));
        } catch (RejectedExecutionException e) {
            // 队列满：明确拒绝，不要让它变成一个静默悬挂的连接
            throw new BizException(429, "AI 助手当前繁忙，请稍后再试");
        }
        return emitter;
    }

    /**
     * 流式消费主体，跑在线程池里。
     *
     * ⚠️ 这里用的是请求线程捕获好的 userId 与 conv，**不能**再调
     * SecurityUtil.currentUserId() —— SecurityContextHolder 是 ThreadLocal，
     * 在线程池线程里取到的永远是 null。
     */
    private void runStream(String userId, Conversation conv, String userContent, SseEmitter emitter) {
        // SseEmitter 未声明线程安全，而心跳线程与消费线程都会写它，用锁把写操作串行化
        final Object sendLock = new Object();
        final AtomicBoolean closed = new AtomicBoolean(false);
        // 声明在 try 之外：中断分支要拿它落库已下发的部分内容
        final StringBuilder buffer = new StringBuilder();
        ScheduledFuture<?> heartbeat = null;

        try {
            persistUserTurn(conv, userContent);

            send(emitter, sendLock, closed, SseEmitter.event()
                    .name("meta")
                    .data(Map.of("conversationId", conv.getId()), MediaType.APPLICATION_JSON));

            // 心跳：长思考期间（尤其是推理模型出首 token 前）保持连接不被中间层掐断
            heartbeat = heartbeatScheduler.scheduleAtFixedRate(
                    () -> send(emitter, sendLock, closed, SseEmitter.event().comment("ping")),
                    HEARTBEAT_MILLIS, HEARTBEAT_MILLIS, TimeUnit.MILLISECONDS);

            AiResponse agg = aiGateway.chatStream(userId, AiScope.ASSISTANT,
                    buildContext(conv.getId()), null, null,
                    delta -> {
                        if (closed.get()) {
                            // 客户端已断开，抛出以中断上游读取，避免继续烧 token
                            throw new IOException("客户端已断开");
                        }
                        buffer.append(delta);
                        send(emitter, sendLock, closed, SseEmitter.event()
                                .name("delta")
                                .data(Map.of("content", delta), MediaType.APPLICATION_JSON));
                    });

            String full = agg.content() == null || agg.content().isEmpty() ? buffer.toString() : agg.content();
            Message assistantMsg = insertMessage(conv.getId(), ROLE_ASSISTANT, full);
            touchConversation(conv.getId());

            Map<String, Object> done = new LinkedHashMap<>();
            done.put("conversationId", conv.getId());
            done.put("messageId", assistantMsg.getId());
            done.put("usage", Map.of(
                    "promptTokens", agg.promptTokens(),
                    "completionTokens", agg.completionTokens(),
                    "totalTokens", agg.totalTokens()));
            send(emitter, sendLock, closed, SseEmitter.event()
                    .name("done").data(done, MediaType.APPLICATION_JSON));

            complete(emitter, closed);
            log.info("助手流式完成 convId={} userId={} chars={}", conv.getId(), userId, full.length());

        } catch (Exception e) {
            if (closed.get()) {
                // 客户端断开不算服务故障：把已下发的增量落库，
                // 否则会话里会留下「有提问、无回复」，下一轮上下文出现连续两条 user 消息
                log.info("助手流式中断（客户端断开）convId={} userId={} chars={}",
                        conv.getId(), userId, buffer.length());
                persistInterruptedReply(conv, buffer.toString());
            } else {
                log.error("助手流式失败 convId={} userId={}: {}", conv.getId(), userId, e.getMessage());
                send(emitter, sendLock, closed, SseEmitter.event().name("error")
                        .data(Map.of("code", 500, "error", "AI 服务暂时不可用，请稍后重试"),
                                MediaType.APPLICATION_JSON));
            }
            complete(emitter, closed);
        } finally {
            if (heartbeat != null) {
                heartbeat.cancel(false);
            }
        }
    }

    /** 中断时落库已收到的部分回复。没有内容则什么都不做 */
    private void persistInterruptedReply(Conversation conv, String partial) {
        if (partial == null || partial.isBlank()) {
            return;
        }
        try {
            insertMessage(conv.getId(), ROLE_ASSISTANT, partial);
            touchConversation(conv.getId());
        } catch (Exception e) {
            log.warn("中断回复落库失败 convId={}: {}", conv.getId(), e.getMessage());
        }
    }

    // ==================== 私有工具 ====================

    /**
     * 所有 emitter 写操作的唯一入口：加锁串行 + 关流短路。
     * 写失败即认为客户端已断开，置 closed 让后续写入与上游消费都停下。
     */
    private void send(SseEmitter emitter, Object sendLock, AtomicBoolean closed,
                      SseEmitter.SseEventBuilder event) {
        if (closed.get()) {
            return;
        }
        synchronized (sendLock) {
            if (closed.get()) {
                return;
            }
            try {
                emitter.send(event);
            } catch (Exception e) {
                closed.set(true);
            }
        }
    }

    private void complete(SseEmitter emitter, AtomicBoolean closed) {
        if (closed.getAndSet(true)) {
            return;
        }
        try {
            emitter.complete();
        } catch (Exception ignored) {
            // 连接已由容器关闭时会抛 IllegalStateException，忽略
        }
    }

    private Conversation requireOwnedAssistant(String userId, String conversationId) {
        Conversation conv = conversationMapper.selectById(conversationId);
        if (conv == null || !Conversation.TYPE_ASSISTANT.equals(conv.getConversationType())) {
            throw new BizException(404, "会话不存在");
        }
        if (!userId.equals(conv.getUserId())) {
            throw new BizException(403, "无权访问该会话");
        }
        return conv;
    }

    /** 落库用户消息，并在标题为空时用首条消息回填 */
    private void persistUserTurn(Conversation conv, String content) {
        insertMessage(conv.getId(), ROLE_USER, content);
        if (conv.getTitle() == null || conv.getTitle().isBlank()) {
            conv.setTitle(titleFrom(content));
        }
        conv.setUpdatedAt(LocalDateTime.now());
        conversationMapper.updateById(conv);
    }

    private void touchConversation(String conversationId) {
        Conversation patch = new Conversation();
        patch.setId(conversationId);
        patch.setUpdatedAt(LocalDateTime.now());
        conversationMapper.updateById(patch);
    }

    private Message insertMessage(String conversationId, String role, String content) {
        Message m = new Message();
        m.setConversationId(conversationId);
        m.setRole(role);
        m.setContent(content);
        m.setMessageType(MSG_TYPE_CHAT);
        messageMapper.insert(m);
        return m;
    }

    private List<Message> loadMessages(String conversationId) {
        return messageMapper.selectList(new LambdaQueryWrapper<Message>()
                .eq(Message::getConversationId, conversationId)
                .orderByAsc(Message::getCreatedAt));
    }

    /**
     * 组装上下文：system + 窗口截断后的历史。
     * 取最近 CONTEXT_MAX_MESSAGES 条，再按字符预算从最旧开始丢，
     * 防止通用对话无限膨胀把 token 成本推高。
     */
    private List<ChatMessage> buildContext(String conversationId) {
        List<Message> recent = messageMapper.selectList(new LambdaQueryWrapper<Message>()
                .eq(Message::getConversationId, conversationId)
                .orderByDesc(Message::getCreatedAt)
                .last("LIMIT " + CONTEXT_MAX_MESSAGES));
        Collections.reverse(recent);   // 反转为时间正序

        Deque<Message> window = new ArrayDeque<>(recent);
        int totalChars = window.stream()
                .mapToInt(m -> m.getContent() == null ? 0 : m.getContent().length())
                .sum();
        while (totalChars > CONTEXT_MAX_CHARS && window.size() > 1) {
            Message dropped = window.pollFirst();
            totalChars -= dropped.getContent() == null ? 0 : dropped.getContent().length();
        }

        List<ChatMessage> result = new ArrayList<>();
        result.add(ChatMessage.system(AssistantPrompts.system()));
        for (Message m : window) {
            result.add(new ChatMessage(m.getRole(), m.getContent()));
        }
        return result;
    }

    private String titleFrom(String content) {
        String flat = content.replaceAll("\\s+", " ").trim();
        return flat.length() <= TITLE_MAX_LEN ? flat : flat.substring(0, TITLE_MAX_LEN);
    }

    /** 批量补消息条数，避免列表接口 N+1 */
    private List<AssistantConversationVO> withMessageCount(List<Conversation> conversations) {
        if (conversations.isEmpty()) {
            return List.of();
        }
        List<String> ids = conversations.stream().map(Conversation::getId).toList();
        Map<String, Long> counts = assistantQueryMapper.countByConversationIds(ids).stream()
                .collect(Collectors.toMap(
                        AssistantQueryMapper.ConversationCount::getConversationId,
                        AssistantQueryMapper.ConversationCount::getMessageCount,
                        (a, b) -> a));
        return conversations.stream()
                .map(c -> AssistantConversationVO.from(c, counts.get(c.getId())))
                .toList();
    }
}
