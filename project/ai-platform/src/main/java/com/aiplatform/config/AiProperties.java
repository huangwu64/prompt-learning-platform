package com.aiplatform.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI 配置：读取 application.yml 中 ai.* 配置。
 *
 * 注意：运行时实际生效的值由 {@link AiConfigHolder} 持有 —— 管理后台可以把它们
 * 覆盖到数据库并热更新。本类只提供**启动时的默认值**，业务代码不要直接读它。
 */
@Data
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    /** 单用户每日 AI 调用上限（非助手场景） */
    private int dailyLimit = 50;

    /** 助手单用户每日调用上限。独立记账，不与苏格拉底抢 dailyLimit */
    private int assistantDailyLimit = 100;

    private Deepseek deepseek = new Deepseek();

    @Data
    public static class Deepseek {
        private String baseUrl = "https://api.deepseek.com";
        private String apiKey = "";
        private String model = "deepseek-chat";
        /** 同步调用读超时 */
        private int timeoutSeconds = 30;
        /** 流式调用整体超时（助手长回复需要更宽裕） */
        private int streamTimeoutSeconds = 120;
        private int maxTokens = 2048;
    }
}
