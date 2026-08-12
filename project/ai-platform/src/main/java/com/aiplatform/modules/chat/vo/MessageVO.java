package com.aiplatform.modules.chat.vo;

import com.aiplatform.modules.chat.entity.Message;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 消息（对外）
 */
@Data
public class MessageVO {

    private String id;
    private String role;
    private String content;
    private String messageType;
    private LocalDateTime createdAt;

    public static MessageVO from(Message m) {
        MessageVO vo = new MessageVO();
        vo.setId(m.getId());
        vo.setRole(m.getRole());
        vo.setContent(m.getContent());
        vo.setMessageType(m.getMessageType());
        vo.setCreatedAt(m.getCreatedAt());
        return vo;
    }
}
