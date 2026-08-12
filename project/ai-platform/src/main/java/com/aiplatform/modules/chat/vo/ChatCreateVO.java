package com.aiplatform.modules.chat.vo;

import lombok.Data;

/**
 * 创建对话响应：对话 + 第一轮追问
 */
@Data
public class ChatCreateVO {

    private ConversationVO conversation;
    private MessageVO message;
}
