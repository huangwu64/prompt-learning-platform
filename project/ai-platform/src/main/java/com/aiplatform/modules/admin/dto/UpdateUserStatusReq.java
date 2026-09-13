package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/**
 * 启用 / 禁用用户。
 * 删除走 DELETE 接口（软删，会同时混淆邮箱用户名），不在这里。
 */
@Data
public class UpdateUserStatusReq {

    @NotBlank(message = "状态不能为空")
    @Pattern(regexp = "active|disabled", message = "状态只能是 active 或 disabled")
    private String status;
}
