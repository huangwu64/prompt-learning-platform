package com.aiplatform.modules.health;

import com.aiplatform.common.Result;
import com.aiplatform.config.AiProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查：服务状态 + 数据库/Redis/DeepSeek 依赖状态
 */
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;
    private final RedisTemplate<String, Object> redisTemplate;
    private final AiProperties aiProperties;

    @GetMapping
    public Result<Map<String, Object>> health() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("status", "ok");
        data.put("timestamp", LocalDateTime.now());
        data.put("version", "0.1.0");

        Map<String, Object> services = new LinkedHashMap<>();
        services.put("database", checkDatabase() ? "connected" : "disconnected");
        services.put("redis", checkRedis() ? "connected" : "disconnected");
        services.put("deepseek",
                aiProperties.getDeepseek().getApiKey() == null || aiProperties.getDeepseek().getApiKey().isBlank()
                        ? "not-configured" : "configured");
        data.put("services", services);
        return Result.ok(data);
    }

    private boolean checkDatabase() {
        try (Connection ignored = dataSource.getConnection()) {
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean checkRedis() {
        try {
            return redisTemplate.getConnectionFactory().getConnection().ping() != null;
        } catch (Exception e) {
            return false;
        }
    }
}
