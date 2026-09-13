package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员重置密码。
 * 由管理员**自行输入**新密码 —— 系统不回显也不生成，避免密码出现在日志/响应里。
 * 注意：密码是 BCrypt 哈希存储的，后台只能重置，**无法查看原密码**。
 */
@Data
public class ResetPasswordReq {

    @NotBlank(message = "新密码不能为空")
    @Size(min = 6, max = 64, message = "密码需 6-64 个字符")
    private String newPassword;
}
