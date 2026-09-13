package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 驳回头像。理由必填 —— 用户要据此判断该怎么改。
 */
@Data
public class RejectAvatarReq {

    @NotBlank(message = "请填写驳回理由")
    @Size(min = 2, max = 200, message = "驳回理由需 2-200 个字符")
    private String reason;
}
