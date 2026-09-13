package com.aiplatform.modules.assistant.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.CustomizableThreadFactory;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 助手流式处理的两个执行器。
 *
 * 刻意用裸 ThreadPoolExecutor 而不是 @EnableAsync —— 后者的代理与事务语义
 * 在「长连接 + 逐 token 回调」场景下只会添乱，这里要的是明确可控的线程与队列。
 */
@Configuration
public class AssistantAsyncConfig {

    /**
     * 流式消费线程池。
     * 有界队列 + AbortPolicy：过载时明确拒绝（由 Service 转成 429 提示），
     * 而不是无限排队把内存和连接拖死。
     */
    @Bean(name = "assistantStreamExecutor", destroyMethod = "shutdown")
    public ThreadPoolExecutor assistantStreamExecutor() {
        ThreadPoolExecutor executor = new ThreadPoolExecutor(
                4, 16,
                60L, TimeUnit.SECONDS,
                new ArrayBlockingQueue<>(32),
                new CustomizableThreadFactory("assistant-stream-"),
                new ThreadPoolExecutor.AbortPolicy());
        executor.allowCoreThreadTimeOut(true);
        return executor;
    }

    /**
     * 心跳调度器。
     * 单线程足够（每 15s 给每个活跃流发一帧注释），它只做「在锁内写一帧」这一件事。
     */
    @Bean(name = "assistantHeartbeatScheduler", destroyMethod = "shutdown")
    public ScheduledExecutorService assistantHeartbeatScheduler() {
        return Executors.newSingleThreadScheduledExecutor(
                new CustomizableThreadFactory("assistant-heartbeat-"));
    }
}
