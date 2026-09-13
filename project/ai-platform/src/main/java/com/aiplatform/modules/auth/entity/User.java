package com.aiplatform.modules.auth.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户
 */
@Data
@TableName("users")
@IdPrefix("user")
public class User {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String email;

    private String username;

    private String passwordHash;

    /** USER / ADMIN */
    private String role;

    /** active / disabled / deleted（软删） */
    private String status;

    /** 当前对外可见的头像，只在审核通过后写入 */
    private String avatar;

    /** none / pending / approved / rejected */
    private String avatarStatus;

    /** 待审头像 URL（审核结束后清空） */
    private String avatarPendingUrl;

    /** 最近一次驳回理由（供用户端展示） */
    private String avatarRejectReason;

    private Integer streakDays;

    private LocalDateTime lastLoginAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
