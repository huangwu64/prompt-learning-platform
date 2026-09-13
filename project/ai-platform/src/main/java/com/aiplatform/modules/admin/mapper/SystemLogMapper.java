package com.aiplatform.modules.admin.mapper;

import com.aiplatform.modules.admin.entity.SystemLog;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Mapper
public interface SystemLogMapper extends BaseMapper<SystemLog> {

    /** 按级别统计，供概览卡 */
    @Select("""
            SELECT level, COUNT(*) AS cnt FROM system_logs
            WHERE created_at >= #{from}
            GROUP BY level
            """)
    List<Map<String, Object>> countByLevel(@Param("from") LocalDateTime from);

    /**
     * 分批清理过期日志。
     * 必须带 LIMIT：一次删太多会长时间持锁，把在线请求堵住。
     * 调用方循环执行直到影响行数为 0。
     */
    @Delete("DELETE FROM system_logs WHERE created_at < #{before} LIMIT #{limit}")
    int deleteOlderThan(@Param("before") LocalDateTime before, @Param("limit") int limit);
}
