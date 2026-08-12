package com.aiplatform.modules.chat.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 苏格拉底对话
 */
@Data
@TableName("conversations")
@IdPrefix("conv")
public class Conversation {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    /** 关联知识点 ID（从学习地图跳转时携带） */
    private String topicId;

    private String originalPrompt;

    private String improvedPrompt;

    /** 改进分析（JSON 字符串，存 JSON 列） */
    private String comparisonResult;

    private Integer rating;

    /** active / completed */
    private String status;

    private Integer currentRound;

    private Integer maxRounds;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
