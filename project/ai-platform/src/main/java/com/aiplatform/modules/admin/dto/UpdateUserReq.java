package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员修改用户的联系方式。
 * 不含 role / status / password / avatar —— 它们各有专用接口，避免一个接口改太多东西。
 */
@Data
public class UpdateUserReq {

    @NotBlank(message = "邮箱不能为空")
    @Email(message = "邮箱格式不正确")
    @Size(max = 100, message = "邮箱过长")
    private String email;

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 30, message = "用户名需 2-30 个字符")
    private String username;
}
