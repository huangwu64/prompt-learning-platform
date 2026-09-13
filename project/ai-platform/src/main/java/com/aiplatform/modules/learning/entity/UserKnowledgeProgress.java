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

    /**
     * 该知识点的历史最好成绩。
     *
     * ⚠️ 字段名与列名仍叫 best_rating（历史遗留），但**口径已是系统综合评分 0-100**，
     * 不再是 1-5 星。对外 VO 已改名为 bestScore 以免误读；列名未做 DDL 重命名。
     */
    private Float bestRating;

    private LocalDateTime updatedAt;
}
