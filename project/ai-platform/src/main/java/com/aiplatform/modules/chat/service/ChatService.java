package com.aiplatform.modules.chat.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.ai.AiScope;
import com.aiplatform.ai.ChatMessage;
import com.aiplatform.common.BizException;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.modules.chat.dto.AiComplete;
import com.aiplatform.modules.chat.dto.AiTurn;
import com.aiplatform.modules.chat.dto.CreateChatReq;
import com.aiplatform.modules.chat.entity.Conversation;
import com.aiplatform.modules.chat.entity.Message;
import com.aiplatform.modules.chat.mapper.ConversationMapper;
import com.aiplatform.modules.chat.mapper.MessageMapper;
import com.aiplatform.modules.chat.prompt.SocraticPrompts;
import com.aiplatform.modules.chat.scoring.PromptScorer;
import com.aiplatform.modules.chat.vo.ChatCreateVO;
import com.aiplatform.modules.chat.vo.ChatDetailVO;
import com.aiplatform.modules.chat.vo.ChatTurnVO;
import com.aiplatform.modules.chat.vo.CompleteVO;
import com.aiplatform.modules.chat.vo.ConversationVO;
import com.aiplatform.modules.chat.vo.MessageVO;
import com.aiplatform.modules.chat.vo.RatingVO;
import com.aiplatform.modules.badges.service.BadgeService;
import com.aiplatform.modules.learning.service.LearningService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 苏格拉底对话：追问状态机 + AI 编排 + 学习进度联动
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatService {

    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_COMPLETED = "completed";
    private static final int DEFAULT_MAX_ROUNDS = 5;

    private final ConversationMapper conversationMapper;
    private final MessageMapper messageMapper;
    private final AiGateway aiGateway;
    private final LearningService learningService;
    private final BadgeService badgeService;
    private final ObjectMapper objectMapper;
    private final PromptScorer promptScorer;
    /** 用于把「创建会话」的多步写入包成一个事务（Spring Boot 自动配置了该 Bean） */
    private final TransactionTemplate transactionTemplate;

    // ============ 创建对话 ============

    public ChatCreateVO create(String userId, CreateChatReq req) {
        // 并发限制：同一用户只能有一个 active 的**苏格拉底**对话。
        // 必须按 conversation_type 过滤 —— 助手会话同样常驻 active，
        // 不过滤的话助手一开，用户就再也创建不了苏格拉底对话了。
        Long activeCount = conversationMapper.selectCount(new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                .eq(Conversation::getConversationType, Conversation.TYPE_SOCRATIC)
                .eq(Conversation::getStatus, STATUS_ACTIVE));
        if (activeCount > 0) {
            throw new BizException(400, "你有一个进行中的对话，请先完成");
        }

        // ⚠️ 顺序很关键：**先调 AI，成功后才落库**。
        //
        // 原实现是「插入会话 → 存用户消息 → 再调 AI」，而方法没有事务，
        // AI 一旦失败，前面两次 insert 已经提交，留下一条 active 但没有 AI 追问的
        // 孤儿会话。接着上面那条「只能有一个 active 对话」的校验就会让用户
        // **再也建不了新对话** —— 界面上表现为「点开始对话没反应」。
        // 先调 AI 则失败即什么都不留。
        AiTurn turn = aiGateway.chatJson(userId, AiScope.SOCRATIC,
                List.of(ChatMessage.system(SocraticPrompts.turnSystem()),
                        ChatMessage.user(buildTurnPrompt(List.of(), req.getOriginalPrompt()))),
                AiTurn.class, null);

        // 落库放进一个事务，避免只写进去一半
        return transactionTemplate.execute(status -> persistNewConversation(userId, req, turn));
    }

    /** 会话 + 用户初始消息 + 首轮追问，一个事务写入 */
    private ChatCreateVO persistNewConversation(String userId, CreateChatReq req, AiTurn turn) {
        Conversation conv = new Conversation();
        conv.setUserId(userId);
        conv.setConversationType(Conversation.TYPE_SOCRATIC);
        conv.setTopicId(req.getTopicId());
        conv.setOriginalPrompt(req.getOriginalPrompt());
        conv.setStatus(STATUS_ACTIVE);
        conv.setCurrentRound(1);
        conv.setMaxRounds(DEFAULT_MAX_ROUNDS);
        conversationMapper.insert(conv);

        messageMapper.insert(buildMessage(conv.getId(), "user", req.getOriginalPrompt(), "answer"));

        String question = turn.getQuestion() != null && !turn.getQuestion().isBlank()
                ? turn.getQuestion() : "请补充说明这个需求的具体场景和对象。";
        Message assistant = buildMessage(conv.getId(), "assistant", question, "question");
        messageMapper.insert(assistant);

        log.info("创建对话 convId={} userId={} topicId={}", conv.getId(), userId, conv.getTopicId());

        ChatCreateVO vo = new ChatCreateVO();
        vo.setConversation(ConversationVO.from(conv, objectMapper));
        vo.setMessage(MessageVO.from(assistant));
        return vo;
    }

    // ============ 回复消息 ============

    public ChatTurnVO reply(String userId, String conversationId, String content) {
        Conversation conv = requireOwnedActive(userId, conversationId);

        // ⚠️ 顺序与 create 同理：**先拼上下文、调完 AI，成功后才落库**。
        // 原实现先插用户消息再调 AI 且没有事务，AI 一失败就留下一条「没有回复」的
        // 用户消息；反复失败会让上下文变成连续多条 user，越积越脏。
        AiTurn turn = aiGateway.chatJson(userId, AiScope.SOCRATIC,
                List.of(ChatMessage.system(SocraticPrompts.turnSystem()),
                        ChatMessage.user(buildTurnPrompt(loadHistory(conv.getId()), content))),
                AiTurn.class, null);

        // 停止判断：AI 判断完成 / 完整度≥80 / 已达轮次上限
        boolean shouldComplete = "complete".equals(turn.getAction())
                || (turn.getConfidence() != null && turn.getConfidence() >= 80)
                || conv.getCurrentRound() + 1 >= conv.getMaxRounds();
        if (shouldComplete) {
            return buildCompletedTurn(completeConversation(userId, conv, content));
        }

        return transactionTemplate.execute(status -> persistTurn(conv, content, turn));
    }

    /** 用户消息 + AI 追问 + 轮次推进，一个事务写入 */
    private ChatTurnVO persistTurn(Conversation conv, String userContent, AiTurn turn) {
        messageMapper.insert(buildMessage(conv.getId(), "user", userContent, "answer"));

        String question = turn.getQuestion() != null && !turn.getQuestion().isBlank()
                ? turn.getQuestion() : "还有哪些信息需要补充？";
        Message assistant = buildMessage(conv.getId(), "assistant", question, "question");
        messageMapper.insert(assistant);

        conv.setCurrentRound(conv.getCurrentRound() + 1);
        conversationMapper.updateById(conv);

        ChatTurnVO vo = new ChatTurnVO();
        vo.setMessage(MessageVO.from(assistant));
        vo.setConversationStatus(STATUS_ACTIVE);
        vo.setCurrentRound(conv.getCurrentRound());
        vo.setMaxRounds(conv.getMaxRounds());
        return vo;
    }

    // ============ 完成对话（用户主动） ============

    public CompleteVO complete(String userId, String conversationId) {
        Conversation conv = requireOwnedSocratic(userId, conversationId);
        if (STATUS_COMPLETED.equals(conv.getStatus())) {
            throw new BizException(400, "该对话已完成");
        }
        Conversation updated = completeConversation(userId, conv, null);

        CompleteVO vo = new CompleteVO();
        vo.setConversation(ConversationVO.from(updated, objectMapper));
        return vo;
    }

    /**
     * 生成优化结果并置为 completed（AI 判断或用户主动触发共用）。
     *
     * @param pendingUserContent 尚未落库的那条用户消息；用户主动「直接生成结果」时为 null
     */
    private Conversation completeConversation(String userId, Conversation conv, String pendingUserContent) {
        AiComplete aiComplete = aiGateway.chatJson(userId, AiScope.SOCRATIC,
                List.of(ChatMessage.system(SocraticPrompts.completeSystem()),
                        ChatMessage.user(buildCompletePrompt(loadHistory(conv.getId()), pendingUserContent))),
                AiComplete.class, null);
        String improvedPrompt = aiComplete.getImprovedPrompt() != null
                ? aiComplete.getImprovedPrompt() : conv.getOriginalPrompt();

        // ===== 系统综合评分（完整度 70% + 轮数效率 30%）=====
        // 这是掌握度与能力雷达的唯一依据；用户星级只作体验反馈、不参与计分。
        // 待落库的那条用户消息也要参与评分，所以先拼一个含它的临时列表。
        List<Message> forScoring = new ArrayList<>(loadHistory(conv.getId()));
        if (pendingUserContent != null && !pendingUserContent.isBlank()) {
            Message pending = new Message();
            pending.setRole("user");
            pending.setContent(pendingUserContent);
            pending.setMessageType("answer");
            forScoring.add(pending);
        }
        int roundsUsed = conv.getCurrentRound() + (pendingUserContent != null && !pendingUserContent.isBlank() ? 1 : 0);
        PromptScorer.ScoreResult scored = promptScorer.evaluate(
                conv.getOriginalPrompt(), forScoring, roundsUsed, conv.getMaxRounds());

        Conversation completed = transactionTemplate.execute(status -> {
            // 补上那条待落库的用户消息（顺序上应在 summary 之前）
            if (pendingUserContent != null && !pendingUserContent.isBlank()) {
                messageMapper.insert(buildMessage(conv.getId(), "user", pendingUserContent, "answer"));
            }
            conv.setStatus(STATUS_COMPLETED);
            conv.setImprovedPrompt(improvedPrompt);
            conv.setScore(scored.total());
            conv.setElementScores(toJson(scored.elements()));
            conv.setComparisonResult(toJson(Map.of("improvements",
                    aiComplete.getImprovements() != null ? aiComplete.getImprovements() : List.of())));
            conversationMapper.updateById(conv);

            messageMapper.insert(buildMessage(conv.getId(), "assistant", improvedPrompt, "summary"));
            return conv;
        });

        // ===== 完成后的联动（放在事务外，各自独立事务）=====

        // 打卡：完成任意一次对话即算当天打卡
        learningService.checkIn(userId);

        // 学习地图掌握度：用**系统综合评分**判定（不再是用户星级）；
        // 只有从学习地图跳进来、关联了知识点的对话才写进度
        if (completed.getTopicId() != null && !completed.getTopicId().isBlank()) {
            learningService.updateProgress(userId, completed.getTopicId(), scored.total());
        }

        log.info("对话完成 convId={} 综合评分={} 完整度={} 轮数效率={} 补齐要素={}/5",
                completed.getId(), scored.total(), scored.completeness(),
                scored.efficiency(), scored.filledCount());
        return completed;
    }

    /**
     * 回合判断调用的用户消息：历史 + 本轮输入 + 明确指令。
     *
     * ⚠️ 这里把历史**压平成一段文本**，而不是按 role 逐条传历史消息 —— 这是踩坑后的修法：
     * 历史里的 assistant 轮次是**散文**（就是追问的问题本身），模型会模仿上下文风格去
     * 输出散文，而 response_format=json_object 又不允许散文，最终**只吐出一串空白**，
     * 表现为「AI 返回内容为空，请重试」，且**轮次越多越必然复现**（与温度无关，实测
     * 同一上下文在 0.2 温度下 3/3 失败）。
     * 压平后上下文里只剩 system + user，没有可模仿的散文轮次。
     */
    private String buildTurnPrompt(List<Message> history, String currentInput) {
        StringBuilder sb = new StringBuilder("【对话历史】\n");
        if (history.isEmpty()) {
            sb.append("（这是第一轮，暂无历史）");
        } else {
            appendTranscript(sb, history);
        }
        sb.append("\n\n【本轮用户输入】\n").append(currentInput)
                .append("\n\n请判断下一步动作，并严格按照系统提示要求的 JSON 格式输出。");
        return sb.toString();
    }

    /** 生成优化结果调用的用户消息，同样用压平的历史 */
    private String buildCompletePrompt(List<Message> history, String pendingUserContent) {
        StringBuilder sb = new StringBuilder("【完整对话】\n");
        if (history.isEmpty()) {
            sb.append("（暂无历史）");
        } else {
            appendTranscript(sb, history);
        }
        if (pendingUserContent != null && !pendingUserContent.isBlank()) {
            sb.append("\n用户：").append(pendingUserContent);
        }
        sb.append("\n\n请严格按照系统提示要求的 JSON 格式输出优化后的提示词与改进点。");
        return sb.toString();
    }

    private void appendTranscript(StringBuilder sb, List<Message> history) {
        boolean first = true;
        for (Message m : history) {
            if (!first) {
                sb.append('\n');
            }
            first = false;
            sb.append("assistant".equals(m.getRole()) ? "助手" : "用户").append("：")
                    .append(m.getContent() == null ? "" : m.getContent());
        }
    }

    /** 组装回复接口的「已完成」响应 */
    private ChatTurnVO buildCompletedTurn(Conversation conv) {
        ChatTurnVO vo = new ChatTurnVO();
        vo.setConversationStatus(STATUS_COMPLETED);
        vo.setCurrentRound(conv.getCurrentRound());
        vo.setMaxRounds(conv.getMaxRounds());
        vo.setImprovedPrompt(conv.getImprovedPrompt());
        vo.setComparisonResult(parseJson(conv.getComparisonResult()));
        return vo;
    }

    // ============ 对话详情 / 历史 ============

    public ChatDetailVO detail(String userId, String conversationId) {
        Conversation conv = requireOwnedSocratic(userId, conversationId);
        List<Message> messages = loadHistory(conversationId);

        ChatDetailVO vo = new ChatDetailVO();
        vo.setConversation(ConversationVO.from(conv, objectMapper));
        vo.setMessages(messages.stream().map(MessageVO::from).toList());
        return vo;
    }

    public PageResult<ConversationVO> history(String userId, PageQuery pq, String status) {
        Page<Conversation> page = new Page<>(pq.getPage(), pq.getPageSize());
        LambdaQueryWrapper<Conversation> qw = new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                // 只返回苏格拉底对话，否则助手会话会污染历史列表
                .eq(Conversation::getConversationType, Conversation.TYPE_SOCRATIC)
                .orderByDesc(Conversation::getCreatedAt);
        if (status != null && !status.isBlank()) {
            qw.eq(Conversation::getStatus, status);
        }
        conversationMapper.selectPage(page, qw);
        List<ConversationVO> items = page.getRecords().stream()
                .map(c -> ConversationVO.from(c, objectMapper)).toList();
        return PageResult.of(page, items);
    }

    // ============ 评分 ============

    @Transactional
    public RatingVO rating(String userId, String conversationId, Integer rating) {
        Conversation conv = requireOwnedSocratic(userId, conversationId);
        if (!STATUS_COMPLETED.equals(conv.getStatus())) {
            throw new BizException(400, "该对话尚未完成，无法评分");
        }
        conv.setRating(rating);
        conversationMapper.updateById(conv);

        // 注意：用户星级**不再联动学习进度** —— 它只是体验反馈。
        // 学习地图的掌握度由完成对话时算出的系统综合评分决定（见 completeConversation）。

        // 徽章触发：首次评分 / 累计对话数
        badgeService.checkAndUnlock(userId, "first_rating", 1);
        // 徽章只统计苏格拉底对话：否则用户狂刷助手就能刷出「累计对话数」成就，口径也被稀释
        long convCount = conversationMapper.selectCount(new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                .eq(Conversation::getConversationType, Conversation.TYPE_SOCRATIC));
        badgeService.checkAndUnlock(userId, "conversation_count", (int) convCount);

        log.info("对话评分 convId={} userId={} rating={}", conversationId, userId, rating);

        RatingVO vo = new RatingVO();
        vo.setConversationId(conversationId);
        vo.setRating(rating);
        vo.setAverageScore(averageScore(userId));
        vo.setMasteredTopics(learningService.getProgress(userId).getStats().getMasteredCount());
        return vo;
    }

    /** 最近 20 条已完成对话的**系统综合评分**均值（0-100） */
    private Double averageScore(String userId) {
        List<Conversation> recent = conversationMapper.selectList(new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                // 助手会话不参与评分，不加过滤会挤占 LIMIT 20 的统计窗口
                .eq(Conversation::getConversationType, Conversation.TYPE_SOCRATIC)
                .isNotNull(Conversation::getScore)
                .orderByDesc(Conversation::getCreatedAt)
                .last("LIMIT 20"));
        if (recent.isEmpty()) {
            return null;
        }
        return Math.round(recent.stream().mapToInt(Conversation::getScore).average().orElse(0) * 10) / 10.0;
    }

    // ============ 私有工具 ============

    private Conversation requireOwned(String userId, String id) {
        Conversation conv = conversationMapper.selectById(id);
        if (conv == null) {
            throw new BizException(404, "对话不存在");
        }
        if (!userId.equals(conv.getUserId())) {
            throw new BizException(403, "无权访问该对话");
        }
        return conv;
    }

    /**
     * 苏格拉底专属操作（detail / reply / complete / rating）的守卫。
     * 助手会话复用同一张表但语义不同，误调这些接口应明确拒绝，而不是产生脏数据。
     */
    private Conversation requireOwnedSocratic(String userId, String id) {
        Conversation conv = requireOwned(userId, id);
        if (!Conversation.TYPE_SOCRATIC.equals(conv.getConversationType())) {
            throw new BizException(400, "该会话不支持此操作");
        }
        return conv;
    }

    private Conversation requireOwnedActive(String userId, String id) {
        Conversation conv = requireOwnedSocratic(userId, id);
        if (STATUS_COMPLETED.equals(conv.getStatus())) {
            throw new BizException(400, "该对话已结束，无法继续回复");
        }
        return conv;
    }

    private List<Message> loadHistory(String conversationId) {
        return messageMapper.selectList(new LambdaQueryWrapper<Message>()
                .eq(Message::getConversationId, conversationId)
                .orderByAsc(Message::getCreatedAt));
    }

    private Message buildMessage(String conversationId, String role, String content, String type) {
        Message m = new Message();
        m.setConversationId(conversationId);
        m.setRole(role);
        m.setContent(content);
        m.setMessageType(type);
        return m;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BizException(500, "数据处理异常");
        }
    }

    private JsonNode parseJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
