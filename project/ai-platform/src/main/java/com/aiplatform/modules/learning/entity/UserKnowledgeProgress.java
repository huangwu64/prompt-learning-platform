package com.aiplatform.modules.learning.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户知识点进度
 */
@Data
@TableName("user_knowledge_progress")
@IdPrefix("ukp")
public class UserKnowledgeProgress {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    private String knowledgePointId;

    /** locked / learning / mastered */
    private String status;

    private Float bestRating;

    private LocalDateTime updatedAt;
}
