package com.aiplatform.modules.admin.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * 管理员直接设定用户头像。
 *
 * 这是**跳过审核**的特权通道（用于帮用户纠正明显违规/损坏的头像），
 * 因此只接受本服务已上传文件的路径前缀，不接受任意外链。
 */
@Data
public class SetAvatarReq {

    @NotBlank(message = "头像地址不能为空")
    @Size(max = 255, message = "头像地址过长")
    private String avatar;
}
