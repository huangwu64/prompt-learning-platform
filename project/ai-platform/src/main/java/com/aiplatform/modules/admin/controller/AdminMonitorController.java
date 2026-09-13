package com.aiplatform.modules.admin.controller;

import com.aiplatform.common.Result;
import com.aiplatform.modules.admin.service.MonitorService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 后台监控。
 *
 * days 加了范围校验（1-365）—— 越界直接 400，而不是让一条 SQL 去扫全表。
 */
@Validated
@RestController
@RequestMapping("/api/admin/monitor")
@RequiredArgsConstructor
public class AdminMonitorController {

    private final MonitorService monitorService;

    /** 概览：KPI + AI 指标 + 健康 + 内容统计 + 最近错误，一次拿全 */
    @GetMapping("/overview")
    public Result<Map<String, Object>> overview(
            @RequestParam(defaultValue = "7") @Min(1) @Max(365) int days) {
        return Result.ok(monitorService.overview(days));
    }

    @GetMapping("/ai")
    public Result<Map<String, Object>> ai(
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days) {
        return Result.ok(monitorService.aiMetrics(days));
    }

    /** 依赖探活 + JVM/连接池指标 */
    @GetMapping("/health")
    public Result<Map<String, Object>> health() {
        return Result.ok(monitorService.health());
    }

    @GetMapping("/content")
    public Result<Map<String, Object>> content() {
        return Result.ok(monitorService.contentStats());
    }

    /** 趋势：metric 取 users / conversations / works */
    @GetMapping("/trends")
    public Result<List<Map<String, Object>>> trends(
            @RequestParam(defaultValue = "30") @Min(1) @Max(365) int days,
            @RequestParam(defaultValue = "users") String metric) {
        return Result.ok(monitorService.trends(days, metric));
    }
}
