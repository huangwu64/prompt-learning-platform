package com.aiplatform.modules.assistant.vo;

import com.aiplatform.modules.chat.entity.Conversation;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 助手会话（列表项）
 */
@Data
public class AssistantConversationVO {

    private String id;
    private String title;
    /** 消息条数（批量聚合查询得出，避免 N+1） */
    private Long messageCount;
    /** 最后活动时间，取会话的 updatedAt（每次收发消息都会 touch） */
    private LocalDateTime lastMessageAt;
    private LocalDateTime createdAt;

    public static AssistantConversationVO from(Conversation c, Long messageCount) {
        AssistantConversationVO vo = new AssistantConversationVO();
        vo.setId(c.getId());
        vo.setTitle(c.getTitle());
        vo.setMessageCount(messageCount == null ? 0L : messageCount);
        vo.setLastMessageAt(c.getUpdatedAt());
        vo.setCreatedAt(c.getCreatedAt());
        return vo;
    }
}
