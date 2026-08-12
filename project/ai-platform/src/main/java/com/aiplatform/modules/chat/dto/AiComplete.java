package com.aiplatform.modules.chat.dto;

import lombok.Data;

import java.util.List;

/**
 * AI 生成优化结果
 */
@Data
public class AiComplete {

    /** 优化后的完整提示词 */
    private String improvedPrompt;

    /** 改进点列表 */
    private List<String> improvements;
}
