package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新 AI 配置。
 *
 * apiKey 字段为 null/空、或等于脱敏串时**保留原值** ——
 * 前端不需要（也不该）回填真实密钥。
 */
@Data
public class UpdateAiConfigReq {

    @NotBlank(message = "baseUrl 不能为空")
    @Size(max = 255, message = "baseUrl 过长")
    @Pattern(regexp = "^https?://.+", message = "baseUrl 必须以 http:// 或 https:// 开头")
    private String baseUrl;

    /** 留空表示不修改；传脱敏串（含 ****）同样视为不修改 */
    @Size(max = 255, message = "apiKey 过长")
    private String apiKey;

    @NotBlank(message = "model 不能为空")
    @Size(max = 64, message = "model 过长")
    private String model;

    /** 0 表示不限量（开发/联调场景） */
    @Min(value = 0, message = "日配额不能为负")
    @Max(value = 100000, message = "日配额过大")
    private Integer dailyLimit;

    /** 0 表示不限量 */
    @Min(value = 0, message = "助手日配额不能为负")
    @Max(value = 100000, message = "助手日配额过大")
    private Integer assistantDailyLimit;

    @Min(value = 1, message = "超时至少 1 秒")
    @Max(value = 600, message = "超时最多 600 秒")
    private Integer timeoutSeconds;

    @Min(value = 1, message = "流式超时至少 1 秒")
    @Max(value = 1800, message = "流式超时最多 1800 秒")
    private Integer streamTimeoutSeconds;

    @Min(value = 1, message = "max_tokens 至少为 1")
    @Max(value = 100000, message = "max_tokens 过大")
    private Integer maxTokens;

    private Boolean enabled;
}
