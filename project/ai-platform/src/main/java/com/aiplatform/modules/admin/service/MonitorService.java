package com.aiplatform.modules.admin.service;

import com.aiplatform.config.AiConfigHolder;
import com.aiplatform.config.AiRuntimeConfig;
import com.aiplatform.modules.admin.entity.SystemLog;
import com.aiplatform.modules.admin.mapper.AiUsageMapper;
import com.aiplatform.modules.admin.mapper.MonitorQueryMapper;
import com.aiplatform.modules.admin.mapper.SystemLogMapper;
import com.aiplatform.modules.health.service.HealthService;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 后台监控：AI 指标 / 系统健康 / 用户与内容统计。
 *
 * 返回结构用 Map 而非逐字段 VO —— 见 MonitorQueryMapper 上的说明。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MonitorService {

    /** 概览里"最近错误"的条数 */
    private static final int RECENT_ERROR_LIMIT = 5;

    private final AiUsageMapper usageMapper;
    private final MonitorQueryMapper monitorQueryMapper;
    private final SystemLogMapper systemLogMapper;
    private final HealthService healthService;
    private final AiConfigHolder aiConfigHolder;

    /** 概览：一次请求喂满首页，避免前端瀑布式发多个请求 */
    public Map<String, Object> overview(int days) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("days", days);
        result.put("kpi", kpi(days));
        result.put("ai", aiMetrics(days));
        result.put("health", healthService.dependencyStatus());
        result.put("system", healthService.systemMetrics());
        result.put("content", contentStats());
        result.put("recentErrors", recentErrors());
        return result;
    }

    /** AI 调用指标：按天、按场景、配额 */
    public Map<String, Object> aiMetrics(int days) {
        LocalDate from = startDate(days);
        AiRuntimeConfig cfg = aiConfigHolder.get();

        long todayCalls = usageMapper.totalCallsOn(LocalDate.now());

        Map<String, Object> quota = new LinkedHashMap<>();
        quota.put("todayCalls", todayCalls);
        quota.put("dailyLimit", cfg.dailyLimit());
        quota.put("assistantDailyLimit", cfg.assistantDailyLimit());
        quota.put("model", cfg.model());
        quota.put("enabled", cfg.enabled());
        quota.put("apiKeyConfigured", cfg.apiKeyConfigured());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("byDay", normalizeUsage(usageMapper.sumByDay(from)));
        result.put("byScope", normalizeUsage(usageMapper.sumByScope(from)));
        result.put("quota", quota);
        return result;
    }

    /** 依赖探活 + JVM/连接池指标。单独一个方法，避免复用到整份 overview 造成重复查询 */
    public Map<String, Object> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("services", healthService.dependencyStatus());
        result.put("system", healthService.systemMetrics());
        return result;
    }

    /** 用户与内容统计（总量 + 今日新增） */
    public Map<String, Object> contentStats() {
        Map<String, Object> users = new LinkedHashMap<>();
        users.put("total", monitorQueryMapper.totalUsers());
        users.put("today", monitorQueryMapper.usersToday());
        users.put("active7d", monitorQueryMapper.activeUsersSince(LocalDateTime.now().minusDays(7)));
        users.put("active30d", monitorQueryMapper.activeUsersSince(LocalDateTime.now().minusDays(30)));

        Map<String, Object> convs = new LinkedHashMap<>();
        convs.put("socratic", monitorQueryMapper.totalSocraticConversations());
        convs.put("assistant", monitorQueryMapper.totalAssistantConversations());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("users", users);
        result.put("conversations", convs);
        result.put("works", Map.of("total", monitorQueryMapper.totalWorks()));
        result.put("pendingAvatarReviews", monitorQueryMapper.pendingAvatarReviews());
        return result;
    }

    /**
     * 趋势数据。
     * metric 只接受 users / conversations / works —— 白名单而非拼接，杜绝注入。
     */
    public List<Map<String, Object>> trends(int days, String metric) {
        LocalDateTime from = startDate(days).atStartOfDay();
        List<Map<String, Object>> rows = switch (metric) {
            case "conversations" -> monitorQueryMapper.conversationsByDay(from);
            case "works" -> monitorQueryMapper.worksByDay(from);
            default -> monitorQueryMapper.usersByDay(from);
        };

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("date", String.valueOf(row.get("day")));
            point.put("count", toLong(row.get("cnt")));
            result.add(point);
        }
        return result;
    }

    // ==================== 私有工具 ====================

    private Map<String, Object> kpi(int days) {
        LocalDate from = startDate(days);
        List<Map<String, Object>> byDay = usageMapper.sumByDay(from);

        long calls = 0;
        long success = 0;
        long tokens = 0;
        long totalCostMs = 0;
        for (Map<String, Object> row : byDay) {
            calls += toLong(row.get("calls"));
            success += toLong(row.get("success"));
            tokens += toLong(row.get("tokens"));
            totalCostMs += toLong(row.get("totalCostMs"));
        }

        Map<String, Object> kpi = new LinkedHashMap<>();
        kpi.put("calls", calls);
        // 无数据时返回 null 而不是 NaN —— 前端要能区分"没有数据"和"成功率为 0"
        kpi.put("successRate", calls > 0 ? Math.round(success * 1000.0 / calls) / 10.0 : null);
        kpi.put("avgLatencyMs", calls > 0 ? Math.round((double) totalCostMs / calls) : null);
        kpi.put("tokens", tokens);
        kpi.put("todayCalls", usageMapper.totalCallsOn(LocalDate.now()));
        kpi.put("totalUsers", monitorQueryMapper.totalUsers());
        kpi.put("activeUsers7d", monitorQueryMapper.activeUsersSince(LocalDateTime.now().minusDays(7)));
        kpi.put("totalConversations", monitorQueryMapper.totalSocraticConversations()
                + monitorQueryMapper.totalAssistantConversations());
        kpi.put("totalWorks", monitorQueryMapper.totalWorks());
        kpi.put("pendingAvatarReviews", monitorQueryMapper.pendingAvatarReviews());
        return kpi;
    }

    private List<Map<String, Object>> recentErrors() {
        List<SystemLog> rows = systemLogMapper.selectList(new LambdaQueryWrapper<SystemLog>()
                .eq(SystemLog::getLevel, "ERROR")
                .orderByDesc(SystemLog::getCreatedAt)
                .last("LIMIT " + RECENT_ERROR_LIMIT));

        List<Map<String, Object>> result = new ArrayList<>();
        for (SystemLog row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("traceId", row.getTraceId());
            item.put("path", row.getPath());
            item.put("statusCode", row.getStatusCode());
            item.put("costMs", row.getCostMs());
            item.put("message", row.getMessage());
            item.put("createdAt", row.getCreatedAt() == null ? null : row.getCreatedAt().toString());
            result.add(item);
        }
        return result;
    }

    /** 把 JDBC 返回的杂类型（Date/BigDecimal/Integer）规整成前端好用的 long 与 ISO 字符串 */
    private List<Map<String, Object>> normalizeUsage(List<Map<String, Object>> rows) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            row.forEach((k, v) -> {
                if (v instanceof java.sql.Date || v instanceof LocalDate) {
                    item.put(k, String.valueOf(v));
                } else if (v instanceof Number) {
                    item.put(k, ((Number) v).longValue());
                } else {
                    item.put(k, v);
                }
            });
            result.add(item);
        }
        return result;
    }

    private LocalDate startDate(int days) {
        int span = Math.max(1, Math.min(days, 365));
        return LocalDate.now().minusDays(span - 1L);
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof BigDecimal bd) {
            return bd.longValue();
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        return 0L;
    }
}
