package com.aiplatform.modules.admin.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 后台监控的内容统计查询。
 *
 * 说明：监控接口的返回刻意用 Map（而非逐字段 VO）—— 它是仪表盘载荷，
 * 嵌套层数多、字段会随图表迭代频繁增减，用 VO 只会引入大量样板代码。
 * 日志查询因为要给前端稳定的表格契约，仍用 SystemLogVO。
 */
@Mapper
public interface MonitorQueryMapper {

    @Select("SELECT DATE(created_at) AS day, COUNT(*) AS cnt FROM users "
            + "WHERE created_at >= #{from} GROUP BY DATE(created_at) ORDER BY day")
    List<Map<String, Object>> usersByDay(@Param("from") LocalDateTime from);

    @Select("SELECT DATE(created_at) AS day, COUNT(*) AS cnt FROM conversations "
            + "WHERE created_at >= #{from} GROUP BY DATE(created_at) ORDER BY day")
    List<Map<String, Object>> conversationsByDay(@Param("from") LocalDateTime from);

    @Select("SELECT DATE(created_at) AS day, COUNT(*) AS cnt FROM works "
            + "WHERE created_at >= #{from} GROUP BY DATE(created_at) ORDER BY day")
    List<Map<String, Object>> worksByDay(@Param("from") LocalDateTime from);

    // ---- 总量（软删用户不计入）----

    @Select("SELECT COUNT(*) FROM users WHERE status <> 'deleted'")
    long totalUsers();

    @Select("SELECT COUNT(*) FROM users")
    long totalUsersIncludingDeleted();

    @Select("SELECT COUNT(*) FROM users WHERE last_login_at >= #{since}")
    long activeUsersSince(@Param("since") LocalDateTime since);

    @Select("SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURDATE()")
    long usersToday();

    @Select("SELECT COUNT(*) FROM conversations WHERE conversation_type = 'socratic'")
    long totalSocraticConversations();

    @Select("SELECT COUNT(*) FROM conversations WHERE conversation_type = 'assistant'")
    long totalAssistantConversations();

    @Select("SELECT COUNT(*) FROM works")
    long totalWorks();

    @Select("SELECT COUNT(*) FROM avatar_reviews WHERE status = 'pending'")
    long pendingAvatarReviews();
}
