package com.aiplatform.modules.badges.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户徽章（已解锁）
 */
@Data
@TableName("user_badges")
@IdPrefix("ub")
public class UserBadge {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    private String badgeId;

    private LocalDateTime unlockedAt;
}
