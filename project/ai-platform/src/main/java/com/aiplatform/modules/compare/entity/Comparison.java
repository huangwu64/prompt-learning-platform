package com.aiplatform.modules.compare.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 智能对比记录
 */
@Data
@TableName("comparisons")
@IdPrefix("cmp")
public class Comparison {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    private String originalPrompt;

    private String comparedPrompt;

    /** 差异分析结果（JSON 字符串，存 JSON 列） */
    private String analysis;

    private LocalDateTime createdAt;
}
