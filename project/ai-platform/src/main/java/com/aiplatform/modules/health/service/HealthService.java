package com.aiplatform.modules.health.service;

import com.aiplatform.config.AiConfigHolder;
import com.zaxxer.hikari.HikariDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.RuntimeMXBean;
import java.lang.management.ThreadMXBean;
import java.sql.Connection;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 健康检查与系统指标。
 *
 * 从 HealthController 里抽出来，让管理后台的监控页能直接复用，
 * 而不是去 HTTP 调自己的 /api/health。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class HealthService {

    private final DataSource dataSource;
    private final RedisTemplate<String, Object> redisTemplate;
    private final AiConfigHolder aiConfigHolder;

    /** 依赖探活：数据库 / Redis / DeepSeek 配置状态 */
    public Map<String, Object> dependencyStatus() {
        Map<String, Object> services = new LinkedHashMap<>();
        services.put("database", checkDatabase() ? "connected" : "disconnected");
        services.put("redis", checkRedis() ? "connected" : "disconnected");
        // 读运行时配置而非 yml：后台改过 apiKey 后这里要能反映真实状态
        services.put("deepseek", aiConfigHolder.get().apiKeyConfigured() ? "configured" : "not-configured");
        return services;
    }

    /** JVM 与连接池指标，供监控页 */
    public Map<String, Object> systemMetrics() {
        RuntimeMXBean runtime = ManagementFactory.getRuntimeMXBean();
        MemoryMXBean memory = ManagementFactory.getMemoryMXBean();
        ThreadMXBean threads = ManagementFactory.getThreadMXBean();

        long heapUsed = memory.getHeapMemoryUsage().getUsed();
        long heapMax = memory.getHeapMemoryUsage().getMax();

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("uptimeSeconds", runtime.getUptime() / 1000);
        metrics.put("heapUsedMb", heapUsed / 1024 / 1024);
        metrics.put("heapMaxMb", heapMax / 1024 / 1024);
        metrics.put("heapUsagePercent", heapMax > 0 ? Math.round(heapUsed * 1000.0 / heapMax) / 10.0 : 0);
        metrics.put("threads", threads.getThreadCount());
        metrics.put("availableProcessors", Runtime.getRuntime().availableProcessors());

        if (dataSource instanceof HikariDataSource hikari) {
            metrics.put("hikariActive", hikari.getHikariPoolMXBean() != null
                    ? hikari.getHikariPoolMXBean().getActiveConnections() : -1);
            metrics.put("hikariIdle", hikari.getHikariPoolMXBean() != null
                    ? hikari.getHikariPoolMXBean().getIdleConnections() : -1);
            metrics.put("hikariWaiting", hikari.getHikariPoolMXBean() != null
                    ? hikari.getHikariPoolMXBean().getThreadsAwaitingConnection() : -1);
            metrics.put("hikariTotal", hikari.getHikariPoolMXBean() != null
                    ? hikari.getHikariPoolMXBean().getTotalConnections() : -1);
        }
        return metrics;
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
