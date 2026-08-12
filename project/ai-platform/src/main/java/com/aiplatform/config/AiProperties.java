package com.aiplatform.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * AI 配置：读取 application.yml 中 ai.* 配置
 */
@Data
@Component
@ConfigurationProperties(prefix = "ai")
public class AiProperties {

    /** 单用户每日 AI 调用上限 */
    private int dailyLimit = 50;

    private Deepseek deepseek = new Deepseek();

    @Data
    public static class Deepseek {
        private String baseUrl = "https://api.deepseek.com";
        private String apiKey = "";
        private String model = "deepseek-chat";
        private int timeoutSeconds = 30;
        private int maxTokens = 2048;
    }
}
