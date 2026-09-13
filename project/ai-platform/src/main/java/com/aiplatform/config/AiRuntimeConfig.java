package com.aiplatform.config;

/**
 * AI 运行时配置快照（不可变）。
 *
 * 用 record 是为了让 AiConfigHolder 能整体原子替换 —— 读侧永远看到一个完整一致的
 * 配置，不会读到「一半新一半旧」的中间态。
 */
public record AiRuntimeConfig(
        String baseUrl,
        String apiKey,
        String model,
        int timeoutSeconds,
        int streamTimeoutSeconds,
        int maxTokens,
        int dailyLimit,
        int assistantDailyLimit,
        /** false = 后台已关闭 AI 能力，所有 AI 调用直接拒绝 */
        boolean enabled) {

    /** 从 application.yml 的 ai.* 构造（管理后台改配置前的默认来源） */
    public static AiRuntimeConfig from(AiProperties props) {
        AiProperties.Deepseek d = props.getDeepseek();
        return new AiRuntimeConfig(
                d.getBaseUrl(),
                d.getApiKey(),
                d.getModel(),
                d.getTimeoutSeconds(),
                d.getStreamTimeoutSeconds(),
                d.getMaxTokens(),
                props.getDailyLimit(),
                props.getAssistantDailyLimit(),
                true);
    }

    public boolean apiKeyConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
