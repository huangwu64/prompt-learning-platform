package com.aiplatform.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 注册请求
 */
@Data
public class RegisterReq {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不合法")
    @Size(max = 100, message = "邮箱长度不能超过 100 字符")
    private String email;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 50, message = "密码长度需在 6—50 字符之间")
    private String password;

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 30, message = "用户名长度需在 2—30 字符之间")
    private String username;
}
