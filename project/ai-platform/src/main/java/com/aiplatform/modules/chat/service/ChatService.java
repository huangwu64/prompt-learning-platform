package com.aiplatform.modules.chat.service;

import com.aiplatform.ai.AiGateway;
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
import com.aiplatform.modules.chat.vo.ChatCreateVO;
import com.aiplatform.modules.chat.vo.ChatDetailVO;
import com.aiplatform.modules.chat.vo.ChatTurnVO;
import com.aiplatform.modules.chat.vo.CompleteVO;
import com.aiplatform.modules.chat.vo.ConversationVO;
import com.aiplatform.modules.chat.vo.MessageVO;
import com.aiplatform.modules.chat.vo.RatingVO;
import com.aiplatform.modules.learning.service.LearningService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 苏格拉底对话：追问状态机 + AI 编排 + 学习进度联动
 */
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
    private final ObjectMapper objectMapper;

    // ============ 创建对话 ============

    public ChatCreateVO create(String userId, CreateChatReq req) {
        // 并发限制：同一用户只能有一个 active 对话
        Long activeCount = conversationMapper.selectCount(new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                .eq(Conversation::getStatus, STATUS_ACTIVE));
        if (activeCount > 0) {
            throw new BizException(400, "你有一个进行中的对话，请先完成");
        }

        Conversation conv = new Conversation();
        conv.setUserId(userId);
        conv.setTopicId(req.getTopicId());
        conv.setOriginalPrompt(req.getOriginalPrompt());
        conv.setStatus(STATUS_ACTIVE);
        conv.setCurrentRound(0);
        conv.setMaxRounds(DEFAULT_MAX_ROUNDS);
        conversationMapper.insert(conv);

        // 存用户初始消息
        messageMapper.insert(buildMessage(conv.getId(), "user", req.getOriginalPrompt(), "answer"));

        // AI 生成首轮追问
        AiTurn turn = aiGateway.chatJson(userId,
                List.of(ChatMessage.system(SocraticPrompts.system()),
                        ChatMessage.user(req.getOriginalPrompt())),
                AiTurn.class, null);

        Message assistant = buildMessage(conv.getId(), "assistant",
                turn.getQuestion() != null && !turn.getQuestion().isBlank()
                        ? turn.getQuestion() : "请补充说明这个需求的具体场景和对象。",
                "question");
        messageMapper.insert(assistant);

        conv.setCurrentRound(1);
        conversationMapper.updateById(conv);

        ChatCreateVO vo = new ChatCreateVO();
        vo.setConversation(ConversationVO.from(conv, objectMapper));
        vo.setMessage(MessageVO.from(assistant));
        return vo;
    }

    // ============ 回复消息 ============

    public ChatTurnVO reply(String userId, String conversationId, String content) {
        Conversation conv = requireOwnedActive(userId, conversationId);

        // 存用户回复
        messageMapper.insert(buildMessage(conv.getId(), "user", content, "answer"));

        // 组装上下文：system + 全部历史消息
        List<ChatMessage> messages = buildContextMessages(conv.getId());

        AiTurn turn = aiGateway.chatJson(userId, messages, AiTurn.class, null);

        // 停止判断：AI 判断完成 / 完整度≥80 / 已达轮次上限
        boolean shouldComplete = "complete".equals(turn.getAction())
                || (turn.getConfidence() != null && turn.getConfidence() >= 80)
                || conv.getCurrentRound() + 1 >= conv.getMaxRounds();
        if (shouldComplete) {
            return buildCompletedTurn(completeConversation(userId, conv));
        }

        // 继续追问
        Message assistant = buildMessage(conv.getId(), "assistant",
                turn.getQuestion() != null && !turn.getQuestion().isBlank()
                        ? turn.getQuestion() : "还有哪些信息需要补充？",
                "question");
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
        Conversation conv = requireOwned(userId, conversationId);
        if (STATUS_COMPLETED.equals(conv.getStatus())) {
            throw new BizException(400, "该对话已完成");
        }
        Conversation updated = completeConversation(userId, conv);

        CompleteVO vo = new CompleteVO();
        vo.setConversation(ConversationVO.from(updated, objectMapper));
        return vo;
    }

    /** 生成优化结果并置为 completed，返回更新后的对话（AI 判断或用户主动触发共用） */
    private Conversation completeConversation(String userId, Conversation conv) {
        List<ChatMessage> messages = new ArrayList<>();
        messages.add(ChatMessage.system(SocraticPrompts.completeSystem()));
        messages.addAll(loadHistoryAsAiMessages(conv.getId()));

        AiComplete aiComplete = aiGateway.chatJson(userId, messages, AiComplete.class, null);
        String improvedPrompt = aiComplete.getImprovedPrompt() != null
                ? aiComplete.getImprovedPrompt() : conv.getOriginalPrompt();

        conv.setStatus(STATUS_COMPLETED);
        conv.setImprovedPrompt(improvedPrompt);
        conv.setComparisonResult(toJson(Map.of("improvements",
                aiComplete.getImprovements() != null ? aiComplete.getImprovements() : List.of())));
        conversationMapper.updateById(conv);

        // 存 summary 消息
        messageMapper.insert(buildMessage(conv.getId(), "assistant", improvedPrompt, "summary"));
        return conv;
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
        Conversation conv = requireOwned(userId, conversationId);
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
        Conversation conv = requireOwned(userId, conversationId);
        if (!STATUS_COMPLETED.equals(conv.getStatus())) {
            throw new BizException(400, "该对话尚未完成，无法评分");
        }
        conv.setRating(rating);
        conversationMapper.updateById(conv);

        // 联动学习进度（从学习地图跳转的对话才关联知识点）
        if (conv.getTopicId() != null && !conv.getTopicId().isBlank()) {
            learningService.updateProgress(userId, conv.getTopicId(), rating);
        }

        RatingVO vo = new RatingVO();
        vo.setConversationId(conversationId);
        vo.setRating(rating);
        vo.setAverageRating(averageRating(userId));
        vo.setMasteredTopics(learningService.getProgress(userId).getStats().getMasteredCount());
        return vo;
    }

    /** 最近 20 条已评分对话的平均分 */
    private Double averageRating(String userId) {
        List<Conversation> recent = conversationMapper.selectList(new LambdaQueryWrapper<Conversation>()
                .eq(Conversation::getUserId, userId)
                .isNotNull(Conversation::getRating)
                .orderByDesc(Conversation::getCreatedAt)
                .last("LIMIT 20"));
        if (recent.isEmpty()) {
            return null;
        }
        return Math.round(recent.stream().mapToInt(Conversation::getRating).average().orElse(0) * 10) / 10.0;
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

    private Conversation requireOwnedActive(String userId, String id) {
        Conversation conv = requireOwned(userId, id);
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

    private List<ChatMessage> loadHistoryAsAiMessages(String conversationId) {
        List<ChatMessage> result = new ArrayList<>();
        for (Message m : loadHistory(conversationId)) {
            result.add(new ChatMessage(m.getRole(), m.getContent()));
        }
        return result;
    }

    private List<ChatMessage> buildContextMessages(String conversationId) {
        List<ChatMessage> result = new ArrayList<>();
        result.add(ChatMessage.system(SocraticPrompts.system()));
        result.addAll(loadHistoryAsAiMessages(conversationId));
        return result;
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
