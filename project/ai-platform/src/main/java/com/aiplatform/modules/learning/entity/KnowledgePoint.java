package com.aiplatform.modules.learning.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

/**
 * 学习知识点（配置表，seed 初始化）
 */
@Data
@TableName("knowledge_points")
@IdPrefix("topic")
public class KnowledgePoint {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    /** beginner / intermediate / advanced / master */
    private String stage;

    private String name;

    private Integer sortOrder;

    /** 掌握所需评分阈值 */
    private Float unlockThreshold;
}
