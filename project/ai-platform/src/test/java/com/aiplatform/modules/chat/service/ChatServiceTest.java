package com.aiplatform.modules.chat.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.common.BizException;
import com.aiplatform.modules.badges.service.BadgeService;
import com.aiplatform.modules.chat.dto.AiComplete;
import com.aiplatform.modules.chat.dto.AiTurn;
import com.aiplatform.modules.chat.dto.CreateChatReq;
import com.aiplatform.modules.chat.entity.Conversation;
import com.aiplatform.modules.chat.entity.Message;
import com.aiplatform.modules.chat.mapper.ConversationMapper;
import com.aiplatform.modules.chat.mapper.MessageMapper;
import com.aiplatform.modules.chat.scoring.PromptScorer;
import com.aiplatform.modules.chat.vo.ChatCreateVO;
import com.aiplatform.modules.chat.vo.ChatTurnVO;
import com.aiplatform.modules.chat.vo.RatingVO;
import com.aiplatform.modules.learning.service.LearningService;
import com.aiplatform.modules.learning.vo.LearningProgressVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionCallback;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 苏格拉底对话服务单元测试（追问状态机）
 */
@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ConversationMapper conversationMapper;
    @Mock
    private MessageMapper messageMapper;
    @Mock
    private AiGateway aiGateway;
    @Mock
    private LearningService learningService;
    @Mock
    private BadgeService badgeService;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @Mock
    private TransactionTemplate transactionTemplate;
    @Mock
    private PromptScorer promptScorer;
    @InjectMocks
    private ChatService chatService;

    /** TransactionTemplate 是 mock 的，直接同步执行回调即可（不涉及真实事务） */
    @BeforeEach
    void stubTransactionTemplate() {
        lenient().when(transactionTemplate.execute(any())).thenAnswer(invocation -> {
            TransactionCallback<?> callback = invocation.getArgument(0);
            return callback.doInTransaction(null);
        });
        // 评分器在本测试里不关心具体算法，给一个固定结果即可
        lenient().when(promptScorer.evaluate(any(), anyList(), anyInt(), anyInt()))
                .thenReturn(new PromptScorer.ScoreResult(List.of(), 80.0, 60.0, 74, 4));
    }

    @Test
    void reply_aiFails_doesNotPersistUserMessage() {
        // 锁住一个真实踩过的坑：原实现「先插用户消息再调 AI」且无事务，
        // AI 失败会留下一条没有回复的用户消息，反复失败后上下文变成连续多条 user。
        when(conversationMapper.selectById("conv_1")).thenReturn(activeConversation());
        when(aiGateway.chatJson(any(), any(), anyList(), eq(AiTurn.class), any()))
                .thenThrow(new BizException(500, "AI 服务暂时不可用"));

        assertThrows(BizException.class, () -> chatService.reply("user_1", "conv_1", "汇报项目进展"));

        verify(messageMapper, never()).insert(any(Message.class));
    }

    private Conversation activeConversation() {
        Conversation conv = new Conversation();
        conv.setId("conv_1");
        conv.setUserId("user_1");
        conv.setConversationType(Conversation.TYPE_SOCRATIC);
        conv.setOriginalPrompt("帮我写个邮件");
        conv.setStatus("active");
        conv.setCurrentRound(1);
        conv.setMaxRounds(5);
        return conv;
    }

    @Test
    void reply_assistantConversation_throws400() {
        // 助手会话复用同一张表，误调苏格拉底接口必须被明确拒绝（会话类型隔离）
        Conversation conv = activeConversation();
        conv.setConversationType(Conversation.TYPE_ASSISTANT);
        when(conversationMapper.selectById("conv_1")).thenReturn(conv);

        BizException ex = assertThrows(BizException.class,
                () -> chatService.reply("user_1", "conv_1", "你好"));

        assertEquals(400, ex.getStatus());
    }

    @Test
    void create_returnsFirstQuestion() {
        when(conversationMapper.selectCount(any())).thenReturn(0L);
        AiTurn turn = new AiTurn();
        turn.setAction("ask");
        turn.setQuestion("收件人是谁？");
        when(aiGateway.chatJson(any(), any(), anyList(), eq(AiTurn.class), any())).thenReturn(turn);

        CreateChatReq req = new CreateChatReq();
        req.setOriginalPrompt("帮我写个邮件");
        ChatCreateVO vo = chatService.create("user_1", req);

        assertNotNull(vo.getConversation());
        assertEquals("收件人是谁？", vo.getMessage().getContent());
        verify(conversationMapper).insert(any(Conversation.class));
        verify(messageMapper, times(2)).insert(any(Message.class));
    }

    @Test
    void create_activeExists_throws400() {
        when(conversationMapper.selectCount(any())).thenReturn(1L);

        CreateChatReq req = new CreateChatReq();
        req.setOriginalPrompt("帮我写个邮件");
        BizException ex = assertThrows(BizException.class, () -> chatService.create("user_1", req));

        assertEquals(400, ex.getStatus());
    }

    @Test
    void reply_ask_continues() {
        when(conversationMapper.selectById("conv_1")).thenReturn(activeConversation());
        AiTurn turn = new AiTurn();
        turn.setAction("ask");
        turn.setQuestion("邮件目的是什么？");
        when(aiGateway.chatJson(any(), any(), anyList(), eq(AiTurn.class), any())).thenReturn(turn);

        ChatTurnVO vo = chatService.reply("user_1", "conv_1", "汇报项目进展");

        assertEquals("active", vo.getConversationStatus());
        assertEquals("邮件目的是什么？", vo.getMessage().getContent());
    }

    @Test
    void reply_complete_finishesConversation() {
        when(conversationMapper.selectById("conv_1")).thenReturn(activeConversation());
        AiTurn turn = new AiTurn();
        turn.setAction("complete");
        when(aiGateway.chatJson(any(), any(), anyList(), eq(AiTurn.class), any())).thenReturn(turn);
        AiComplete complete = new AiComplete();
        complete.setImprovedPrompt("优化后的提示词");
        complete.setImprovements(List.of("增加角色设定"));
        when(aiGateway.chatJson(any(), any(), anyList(), eq(AiComplete.class), any())).thenReturn(complete);

        ChatTurnVO vo = chatService.reply("user_1", "conv_1", "汇报项目进展");

        assertEquals("completed", vo.getConversationStatus());
        assertEquals("优化后的提示词", vo.getImprovedPrompt());
    }

    @Test
    void rating_isFeedbackOnly_andDoesNotTouchLearningProgress() {
        // 锁住改造后的口径：用户星级只是体验反馈；
        // 学习地图的掌握度由**完成对话时的系统综合评分**决定，与星级无关。
        Conversation conv = activeConversation();
        conv.setStatus("completed");
        conv.setTopicId("topic_1");
        when(conversationMapper.selectById("conv_1")).thenReturn(conv);
        when(conversationMapper.selectList(any())).thenReturn(List.of());
        LearningProgressVO progress = new LearningProgressVO();
        LearningProgressVO.Stats stats = new LearningProgressVO.Stats();
        stats.setMasteredCount(2);
        progress.setStats(stats);
        when(learningService.getProgress(any())).thenReturn(progress);

        RatingVO vo = chatService.rating("user_1", "conv_1", 5);

        assertEquals(5, vo.getRating());
        verify(learningService, never()).updateProgress(any(), any(), anyInt());
    }

    @Test
    void rating_active_throws400() {
        when(conversationMapper.selectById("conv_1")).thenReturn(activeConversation());

        BizException ex = assertThrows(BizException.class, () -> chatService.rating("user_1", "conv_1", 5));

        assertEquals(400, ex.getStatus());
    }
}
