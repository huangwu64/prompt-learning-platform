package com.aiplatform.modules.compare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 创建智能对比请求
 */
@Data
public class CompareReq {

    @NotBlank(message = "原始提示词不能为空")
    @Size(max = 2000, message = "原始提示词长度不能超过 2000 字符")
    private String originalPrompt;

    @NotBlank(message = "待对比提示词不能为空")
    @Size(max = 2000, message = "待对比提示词长度不能超过 2000 字符")
    private String comparedPrompt;
}
