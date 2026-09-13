package com.aiplatform.modules.learning.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDate;
import java.util.List;

/**
 * 学习统计与打卡（跨表读写：conversations / users）
 * 由本模块自行查表，避免与 chat 模块形成依赖循环。
 */
@Mapper
public interface LearningStatsMapper {

    /**
     * 平均**系统综合评分**（0-100）。
     * 注意不再取 rating —— 那是用户满意度星级，只作体验反馈，不是学习表现。
     */
    @Select("SELECT AVG(score) FROM conversations "
            + "WHERE user_id = #{userId} AND score IS NOT NULL")
    Double avgScore(@Param("userId") String userId);

    /**
     * 苏格拉底对话数。
     * 必须按 conversation_type 过滤 —— 助手会话共用这张表，
     * 不过滤会把助手对话也算进"学习对话数"。
     */
    @Select("SELECT COUNT(*) FROM conversations "
            + "WHERE user_id = #{userId} AND conversation_type = 'socratic'")
    long countConversations(@Param("userId") String userId);

    @Select("SELECT streak_days FROM users WHERE id = #{userId}")
    Integer streakDays(@Param("userId") String userId);

    /** 最近一次打卡日期，用于判断连续天数该 +1 还是重置 */
    @Select("SELECT last_checkin_date FROM users WHERE id = #{userId}")
    LocalDate lastCheckinDate(@Param("userId") String userId);

    @Update("UPDATE users SET streak_days = #{streak}, last_checkin_date = #{date} WHERE id = #{userId}")
    int updateCheckin(@Param("userId") String userId,
                      @Param("streak") int streak,
                      @Param("date") LocalDate date);

    /**
     * 最近若干次已完成对话的五要素分数（原始 JSON），供能力雷达聚合。
     * 取最近 N 次而非全部：越新的表现越能代表当前水平。
     */
    @Select("SELECT element_scores FROM conversations "
            + "WHERE user_id = #{userId} AND element_scores IS NOT NULL "
            + "ORDER BY created_at DESC LIMIT #{limit}")
    List<String> recentElementScores(@Param("userId") String userId, @Param("limit") int limit);
}
