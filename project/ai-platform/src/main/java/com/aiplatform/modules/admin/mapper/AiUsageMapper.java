package com.aiplatform.modules.admin.mapper;

import com.aiplatform.modules.admin.entity.AiUsageDaily;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * AI 用量统计。
 *
 * 写入用一条 upsert 完成累加（而不是先查再改），避免并发下的丢失更新。
 * 本项目不使用 XML Mapper，聚合查询统一用 @Select 注解。
 */
@Mapper
public interface AiUsageMapper extends BaseMapper<AiUsageDaily> {

    @Insert("""
            INSERT INTO ai_usage_daily
              (user_id, stat_date, scope, call_count, success_count, failure_count,
               prompt_tokens, completion_tokens, total_tokens, total_cost_ms)
            VALUES
              (#{userId}, #{statDate}, #{scope}, 1, #{success}, #{failure},
               #{promptTokens}, #{completionTokens}, #{totalTokens}, #{costMs})
            ON DUPLICATE KEY UPDATE
              call_count        = call_count + 1,
              success_count     = success_count + #{success},
              failure_count     = failure_count + #{failure},
              prompt_tokens     = prompt_tokens + #{promptTokens},
              completion_tokens = completion_tokens + #{completionTokens},
              total_tokens      = total_tokens + #{totalTokens},
              total_cost_ms     = total_cost_ms + #{costMs}
            """)
    int upsertDaily(@Param("userId") String userId,
                    @Param("statDate") LocalDate statDate,
                    @Param("scope") String scope,
                    @Param("success") int success,
                    @Param("failure") int failure,
                    @Param("promptTokens") long promptTokens,
                    @Param("completionTokens") long completionTokens,
                    @Param("totalTokens") long totalTokens,
                    @Param("costMs") long costMs);

    /** 按天聚合（全站），供趋势图 */
    @Select("""
            SELECT stat_date AS statDate,
                   SUM(call_count) AS calls,
                   SUM(success_count) AS success,
                   SUM(failure_count) AS failure,
                   SUM(total_tokens) AS tokens,
                   SUM(total_cost_ms) AS totalCostMs
            FROM ai_usage_daily
            WHERE stat_date >= #{from}
            GROUP BY stat_date
            ORDER BY stat_date
            """)
    List<Map<String, Object>> sumByDay(@Param("from") LocalDate from);

    /** 按场景聚合，供占比图 */
    @Select("""
            SELECT scope,
                   SUM(call_count) AS calls,
                   SUM(total_tokens) AS tokens,
                   SUM(total_cost_ms) AS totalCostMs
            FROM ai_usage_daily
            WHERE stat_date >= #{from}
            GROUP BY scope
            """)
    List<Map<String, Object>> sumByScope(@Param("from") LocalDate from);

    /** 某日总调用量（配额监控用） */
    @Select("SELECT IFNULL(SUM(call_count), 0) FROM ai_usage_daily WHERE stat_date = #{date}")
    long totalCallsOn(@Param("date") LocalDate date);

    /** 某用户某日某场景的调用量（配额监控用） */
    @Select("""
            SELECT IFNULL(SUM(call_count), 0) FROM ai_usage_daily
            WHERE user_id = #{userId} AND stat_date = #{date} AND scope = #{scope}
            """)
    long callsOfUserOn(@Param("userId") String userId,
                       @Param("date") LocalDate date,
                       @Param("scope") String scope);
}
