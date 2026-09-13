package com.aiplatform.modules.profile.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 更新个人资料。
 *
 * 刻意**不包含 avatar** —— 头像必须走「上传 + 后台审核」，
 * 允许在这里直接改 avatar 就绕过了审核。
 */
@Data
public class UpdateProfileReq {

    @NotBlank(message = "用户名不能为空")
    @Size(min = 2, max = 30, message = "用户名需 2-30 个字符")
    private String username;
}
