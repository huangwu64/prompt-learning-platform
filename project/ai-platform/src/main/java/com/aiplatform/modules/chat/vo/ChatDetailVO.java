package com.aiplatform.modules.chat.vo;

import lombok.Data;

import java.util.List;

/**
 * 对话详情响应（对话 + 全部消息）
 */
@Data
public class ChatDetailVO {

    private ConversationVO conversation;
    private List<MessageVO> messages;
}
