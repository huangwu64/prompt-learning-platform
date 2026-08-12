package com.aiplatform.modules.lab.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 测试提示词请求
 */
@Data
public class LabTestReq {

    @NotBlank(message = "提示词不能为空")
    @Size(max = 4000, message = "提示词长度不能超过 4000 字符")
    private String prompt;

    @DecimalMin(value = "0.0", message = "温度值必须在 0.0—2.0 之间")
    @DecimalMax(value = "2.0", message = "温度值必须在 0.0—2.0 之间")
    private Double temperature = 0.7;

    @Min(value = 1, message = "maxTokens 必须在 1—8192 之间")
    @Max(value = 8192, message = "maxTokens 必须在 1—8192 之间")
    private Integer maxTokens = 2048;
}
