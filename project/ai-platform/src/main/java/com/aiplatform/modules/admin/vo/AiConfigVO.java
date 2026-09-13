package com.aiplatform.modules.admin.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 配置（对外）。
 *
 * apiKey 一律脱敏 —— 只在 PUT 时单向上行，永不回显原文。
 */
@Data
public class AiConfigVO {

    private String provider;
    private String baseUrl;

    /** 形如 sk-****abcd；未配置时为空串 */
    private String apiKeyMasked;
    /** 是否已配置（供前端决定是否提示"去配置"） */
    private boolean apiKeyConfigured;
    /** 密钥是来自数据库还是环境变量，便于排查「改了不生效」 */
    private String apiKeySource;

    private String model;
    private Integer dailyLimit;
    private Integer assistantDailyLimit;
    private Integer timeoutSeconds;
    private Integer streamTimeoutSeconds;
    private Integer maxTokens;
    private boolean enabled;

    private String updatedBy;
    private LocalDateTime updatedAt;
}
