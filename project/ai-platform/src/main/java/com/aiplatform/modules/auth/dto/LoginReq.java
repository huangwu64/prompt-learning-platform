package com.aiplatform.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 登录请求
 */
@Data
public class LoginReq {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不合法")
    private String email;

    @NotBlank(message = "密码不能为空")
    private String password;
}
