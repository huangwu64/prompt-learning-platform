package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员新建用户。
 * 用户 id 由系统生成（主键不可指定，也不可修改）。
 */
@Data
public class CreateUserReq {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Size(max = 100, message = "邮箱过长")
    private String email;

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 30, message = "用户名需 2-30 个字符")
    private String username;

    @NotBlank(message = "密码不能为空")
    @Size(min = 6, max = 64, message = "密码需 6-64 个字符")
    private String password;

    /** USER / ADMIN；缺省 USER */
    @Pattern(regexp = "USER|ADMIN", message = "角色只能是 USER 或 ADMIN")
    private String role;
}
