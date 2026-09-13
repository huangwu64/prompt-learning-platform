package com.aiplatform.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicReference;

/**
 * AI 运行时配置持有者。
 *
 * 启动时以 application.yml 的值初始化；管理后台改配置后调用 refresh() 原地替换，
 * 下一个请求立即生效，无需重启服务。
 */
@Slf4j
@Component
public class AiConfigHolder {

    private final AtomicReference<AiRuntimeConfig> ref;

    public AiConfigHolder(AiProperties props) {
        this.ref = new AtomicReference<>(AiRuntimeConfig.from(props));
    }

    public AiRuntimeConfig get() {
        return ref.get();
    }

    /** 整体替换配置快照。读侧无锁，天然线程安全 */
    public void refresh(AiRuntimeConfig config) {
        AiRuntimeConfig prev = ref.getAndSet(config);
        log.info("AI 运行时配置已刷新 model: {} -> {} | dailyLimit: {} -> {} | assistantDailyLimit: {} -> {}",
                prev.model(), config.model(),
                prev.dailyLimit(), config.dailyLimit(),
                prev.assistantDailyLimit(), config.assistantDailyLimit());
    }
}
