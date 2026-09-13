package com.aiplatform.modules.assistant.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 新建助手会话请求。标题可省略，后端会在首条消息时自动回填。
 */
@Data
public class CreateAssistantConvReq {

    @Size(max = 100, message = "标题不能超过 100 字")
    private String title;
}
