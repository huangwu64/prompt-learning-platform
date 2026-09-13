package com.aiplatform.modules.assistant.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 助手发消息请求
 */
@Data
public class AssistantChatReq {

    @NotBlank(message = "会话 ID 不能为空")
    private String conversationId;

    @NotBlank(message = "消息内容不能为空")
    @Size(max = 4000, message = "单条消息不能超过 4000 字")
    private String content;
}
