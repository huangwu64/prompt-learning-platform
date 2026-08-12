package com.aiplatform.modules.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建对话请求
 */
@Data
public class CreateChatReq {

    @NotBlank(message = "提示词不能为空")
    @Size(max = 500, message = "提示词长度不能超过 500 字符")
    private String originalPrompt;

    /** 关联的知识点 ID（从学习地图跳转时携带） */
    private String topicId;
}
