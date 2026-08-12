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

    private String avatar;

    private Integer streakDays;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
