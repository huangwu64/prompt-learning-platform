package com.aiplatform.modules.templates.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 积木构建器模板
 */
@Data
@TableName("templates")
@IdPrefix("tpl")
public class Template {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    private String name;

    /** 积木块数组（JSON 字符串，存 JSON 列） */
    private String blocks;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
