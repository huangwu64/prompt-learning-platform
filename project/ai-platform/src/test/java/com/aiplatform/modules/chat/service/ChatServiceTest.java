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
import com.aiplatform.modules.chat.vo.ChatCreateVO;
import com.aiplatform.modules.chat.vo.ChatTurnVO;
import com.aiplatform.modules.chat.vo.RatingVO;
import com.aiplatform.modules.learning.service.LearningService;
import com.aiplatform.modules.learning.vo.LearningProgressVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
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
    @InjectMocks
    private ChatService chatService;

    private Conversation activeConversation() {
        Conversation conv = new Conversation();
        conv.setId("conv_1");
        conv.setUserId("user_1");
        conv.setOriginalPrompt("帮我写个邮件");
        conv.setStatus("active");
        conv.setCurrentRound(1);
        conv.setMaxRounds(5);
        return conv;
    }

    @Test
    void create_returnsFirstQuestion() {
        when(conversationMapper.selectCount(any())).thenReturn(0L);
        AiTurn turn = new AiTurn();
        turn.setAction("ask");
        turn.setQuestion("收件人是谁？");
        when(aiGateway.chatJson(any(), anyList(), eq(AiTurn.class), any())).thenReturn(turn);

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
        when(aiGateway.chatJson(any(), anyList(), eq(AiTurn.class), any())).thenReturn(turn);

        ChatTurnVO vo = chatService.reply("user_1", "conv_1", "汇报项目进展");

        assertEquals("active", vo.getConversationStatus());
        assertEquals("邮件目的是什么？", vo.getMessage().getContent());
    }

    @Test
    void reply_complete_finishesConversation() {
        when(conversationMapper.selectById("conv_1")).thenReturn(activeConversation());
        AiTurn turn = new AiTurn();
        turn.setAction("complete");
        when(aiGateway.chatJson(any(), anyList(), eq(AiTurn.class), any())).thenReturn(turn);
        AiComplete complete = new AiComplete();
        complete.setImprovedPrompt("优化后的提示词");
        complete.setImprovements(List.of("增加角色设定"));
        when(aiGateway.chatJson(any(), anyList(), eq(AiComplete.class), any())).thenReturn(complete);

        ChatTurnVO vo = chatService.reply("user_1", "conv_1", "汇报项目进展");

        assertEquals("completed", vo.getConversationStatus());
        assertEquals("优化后的提示词", vo.getImprovedPrompt());
    }

    @Test
    void rating_completed_updatesAndLinksLearning() {
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
        verify(learningService).updateProgress(eq("user_1"), eq("topic_1"), eq(5));
    }

    @Test
    void rating_active_throws400() {
        when(conversationMapper.selectById("conv_1")).thenReturn(activeConversation());

        BizException ex = assertThrows(BizException.class, () -> chatService.rating("user_1", "conv_1", 5));

        assertEquals(400, ex.getStatus());
    }
}
