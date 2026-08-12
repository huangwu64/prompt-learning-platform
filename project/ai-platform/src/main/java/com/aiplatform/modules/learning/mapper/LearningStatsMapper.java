package com.aiplatform.modules.learning.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 学习统计只读查询（跨表只读聚合：conversations / users）
 * 由本模块自行查表，避免与 chat 模块形成依赖循环
 */
@Mapper
public interface LearningStatsMapper {

    @Select("SELECT AVG(rating) FROM conversations WHERE user_id = #{userId} AND rating IS NOT NULL")
    Double avgRating(@Param("userId") String userId);

    @Select("SELECT COUNT(*) FROM conversations WHERE user_id = #{userId}")
    long countConversations(@Param("userId") String userId);

    @Select("SELECT streak_days FROM users WHERE id = #{userId}")
    Integer streakDays(@Param("userId") String userId);
}
