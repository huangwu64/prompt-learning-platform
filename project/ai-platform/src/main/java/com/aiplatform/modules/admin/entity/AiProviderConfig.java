package com.aiplatform.modules.admin.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * AI 提供商运行配置（单行，provider='deepseek'）。
 *
 * 这是配置的**唯一真相源**：启动时读它刷新 AiConfigHolder，后台改它立即生效。
 * 环境变量只用于首次播种（库里没有行时）。
 */
@Data
@TableName("ai_provider_config")
@IdPrefix("cfg")
public class AiProviderConfig {

    public static final String PROVIDER_DEEPSEEK = "deepseek";

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String provider;

    private String baseUrl;

    /** AES-GCM 密文；null/空 表示沿用环境变量里的 key */
    private String apiKeyCipher;

    private String model;

    private Integer dailyLimit;

    private Integer assistantDailyLimit;

    private Integer timeoutSeconds;

    private Integer streamTimeoutSeconds;

    private Integer maxTokens;

    /** 0 = 关闭，AI 相关接口一律拒绝 */
    private Integer enabled;

    private String updatedBy;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
