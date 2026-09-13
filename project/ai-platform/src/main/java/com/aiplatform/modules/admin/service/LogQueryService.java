package com.aiplatform.modules.admin.service;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.modules.admin.entity.SystemLog;
import com.aiplatform.modules.admin.mapper.SystemLogMapper;
import com.aiplatform.modules.admin.vo.SystemLogVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 系统日志查询。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LogQueryService {

    private final SystemLogMapper systemLogMapper;

    public PageResult<SystemLogVO> query(String level, String path, String traceId, String userId,
                                         LocalDateTime from, LocalDateTime to, PageQuery pq) {
        LambdaQueryWrapper<SystemLog> qw = new LambdaQueryWrapper<>();
        if (level != null && !level.isBlank()) {
            qw.eq(SystemLog::getLevel, level.trim());
        }
        if (path != null && !path.isBlank()) {
            qw.like(SystemLog::getPath, path.trim());
        }
        if (traceId != null && !traceId.isBlank()) {
            qw.eq(SystemLog::getTraceId, traceId.trim());
        }
        if (userId != null && !userId.isBlank()) {
            qw.eq(SystemLog::getUserId, userId.trim());
        }
        if (from != null) {
            qw.ge(SystemLog::getCreatedAt, from);
        }
        if (to != null) {
            qw.le(SystemLog::getCreatedAt, to);
        }
        qw.orderByDesc(SystemLog::getCreatedAt);

        Page<SystemLog> page = new Page<>(pq.getPage(), pq.getPageSize());
        systemLogMapper.selectPage(page, qw);

        List<SystemLogVO> items = page.getRecords().stream().map(SystemLogVO::from).toList();
        return PageResult.of(page, items);
    }

    /** 按级别计数。三个键恒定存在（无数据时为 0），前端不必做空值判断 */
    public Map<String, Long> stats(int days) {
        Map<String, Long> result = new LinkedHashMap<>();
        result.put("ERROR", 0L);
        result.put("WARN", 0L);
        result.put("SLOW", 0L);

        LocalDateTime from = LocalDateTime.now().minusDays(Math.max(1, days));
        for (Map<String, Object> row : systemLogMapper.countByLevel(from)) {
            Object level = row.get("level");
            Object cnt = row.get("cnt");
            if (level != null) {
                result.put(String.valueOf(level), cnt instanceof Number n ? n.longValue() : 0L);
            }
        }
        return result;
    }
}
