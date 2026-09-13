package com.aiplatform.modules.health;

import com.aiplatform.common.Result;
import com.aiplatform.modules.health.service.HealthService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查：服务状态 + 数据库/Redis/DeepSeek 依赖状态。
 *
 * 探活逻辑已抽到 HealthService，管理后台监控页直接复用同一份实现。
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final HealthService healthService;

    @GetMapping
    public Result<Map<String, Object>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "ok");
        data.put("timestamp", LocalDateTime.now());
        data.put("version", "0.1.0");
        data.put("services", healthService.dependencyStatus());
        return Result.ok(data);
    }
}
