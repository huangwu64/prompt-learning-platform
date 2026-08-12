package com.aiplatform.ai;

/**
 * AI 调用结果：内容 + token 用量
 */
public record AiResponse(String content, int promptTokens, int completionTokens, int totalTokens) {
}
