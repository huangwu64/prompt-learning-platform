package com.aiplatform.modules.badges.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 徽章定义
 */
@Data
@TableName("badges")
@IdPrefix("badge")
public class Badge {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String name;

    private String description;

    /** 解锁条件（JSON 字符串，如 {"type":"streak","target":7}） */
    private String unlockCriteria;

    private LocalDateTime createdAt;
}
