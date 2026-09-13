package com.aiplatform.modules.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 修改密码（用户自助）
 */
@Data
public class ChangePasswordReq {

    @NotBlank(message = "请输入当前密码")
    private String oldPassword;

    @NotBlank(message = "请输入新密码")
    @Size(min = 6, max = 64, message = "密码需 6-64 个字符")
    private String newPassword;
}
