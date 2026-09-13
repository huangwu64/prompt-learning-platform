package com.aiplatform.ai;

/**
 * AI 调用结果：内容 + token 用量 + 结束原因。
 *
 * finishReason 用于诊断「内容为空」这类问题 —— 它能量化区分
 * 「模型主动停了」（stop）和「被 max_tokens 截断」（length）。
 */
public record AiResponse(
        String content,
        int promptTokens,
        int completionTokens,
        int totalTokens,
        /** stop / length / content_filter 等；流式聚合或未提供时为 null */
        String finishReason) {

    /** 兼容不关心 finishReason 的调用点 */
    public AiResponse(String content, int promptTokens, int completionTokens, int totalTokens) {
        this(content, promptTokens, completionTokens, totalTokens, null);
    }

    /** 内容是否为空（含纯空白） */
    public boolean empty() {
        return content == null || content.isBlank();
    }
}
