package com.aiplatform.modules.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;

/**
 * AI 调用日汇总。
 *
 * 改造前用量只存在 Redis（ai:usage:*），**没有历史数据**，所以任何趋势图都画不出来 ——
 * 这张表就是为此新增的。
 */
@Data
@TableName("ai_usage_daily")
public class AiUsageDaily {

    /** 日志/统计类表刻意用自增主键：写入量大，随机字符串主键会造成页分裂 */
    @TableId(type = IdType.AUTO)
    private Long id;

    private String userId;

    private LocalDate statDate;

    /** socratic / assistant / tools */
    private String scope;

    private Integer callCount;

    private Integer successCount;

    private Integer failureCount;

    private Long promptTokens;

    private Long completionTokens;

    private Long totalTokens;

    /** 累计耗时，查询均值时再除 callCount */
    private Long totalCostMs;
}
