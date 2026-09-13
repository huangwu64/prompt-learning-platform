package com.aiplatform.modules.admin.service;

import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * 有界队列 + 单消费线程的落库器基类。
 *
 * 存在的意义：统计与日志写入**绝不能拖慢主链路**。
 * 因此队列满时选择丢弃并告警，而不是让调用方等待 ——
 * 少一条统计远好过一次请求变慢。
 */
@Slf4j
public abstract class QueuedRecorder<T> {

    private static final long POLL_TIMEOUT_MS = 500;

    private final BlockingQueue<T> queue;
    private final Thread worker;
    private volatile boolean running = true;

    protected QueuedRecorder(String threadName, int capacity) {
        this.queue = new ArrayBlockingQueue<>(capacity);
        this.worker = new Thread(this::consume, threadName);
        this.worker.setDaemon(true);
        this.worker.start();
    }

    protected abstract void persist(T item) throws Exception;

    /** 仅用于日志文案，说明丢的是什么 */
    protected abstract String describe(T item);

    /** 入队。队列满则丢弃，**永不阻塞调用方** */
    protected void enqueue(T item) {
        if (!queue.offer(item)) {
            log.warn("{} 队列已满，丢弃一条（不影响主流程）", describe(item));
        }
    }

    private void consume() {
        while (running || !queue.isEmpty()) {
            try {
                T item = queue.poll(POLL_TIMEOUT_MS, TimeUnit.MILLISECONDS);
                if (item == null) {
                    continue;
                }
                try {
                    persist(item);
                } catch (Exception e) {
                    log.warn("{} 落库失败: {}", describe(item), e.getMessage());
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return;
            }
        }
    }

    /** 关闭时给消费线程一点时间把队列排空，避免丢掉最后几条 */
    @PreDestroy
    public void shutdown() {
        running = false;
        try {
            worker.join(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
