package com.aiplatform.modules.admin.config;

import com.aiplatform.modules.admin.mapper.SystemLogMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 后台相关的基础设施：定时任务开关 + 日志保留清理。
 *
 * 全库此前没有任何 {@code @EnableScheduling}，这是第一次引入。
 */
@Configuration
@EnableScheduling
public class AdminAsyncConfig {
}

/**
 * 系统日志保留策略。
 *
 * 分批删除并带 LIMIT：一次删太多会长时间持锁，把在线请求堵住。
 */
@Slf4j
@Component
@RequiredArgsConstructor
class SystemLogRetentionTask {

    /** 保留天数 */
    private static final int RETENTION_DAYS = 30;
    /** 单批删除条数 */
    private static final int BATCH_SIZE = 5000;
    /** 单次任务最多跑几批（上限 10 万条），避免异常情况下长时间占用连接 */
    private static final int MAX_BATCHES = 20;

    private final SystemLogMapper systemLogMapper;

    /** 每天 03:30 执行，避开白天使用高峰 */
    @Scheduled(cron = "0 30 3 * * ?")
    public void cleanExpiredLogs() {
        LocalDateTime before = LocalDateTime.now().minusDays(RETENTION_DAYS);
        int total = 0;
        try {
            for (int i = 0; i < MAX_BATCHES; i++) {
                int deleted = systemLogMapper.deleteOlderThan(before, BATCH_SIZE);
                total += deleted;
                if (deleted < BATCH_SIZE) {
                    break;
                }
            }
            if (total > 0) {
                log.info("清理 {} 天前的系统日志 {} 条", RETENTION_DAYS, total);
            }
        } catch (Exception e) {
            log.warn("系统日志清理失败（已删 {} 条）: {}", total, e.getMessage());
        }
    }
}
