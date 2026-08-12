package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.aiplatform.config.AiProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;

/**
 * AI 网关：全站唯一 AI 出口。
 * 统一：每日配额（Redis）、熔断与重试（Resilience4j）、JSON 解析、错误降级。
 */
@Slf4j
@Service
public class AiGateway {

    private final AiHttpClient httpClient;
    private final AiProperties props;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;

    public AiGateway(AiHttpClient httpClient,
                     AiProperties props,
                     RedisTemplate<String, Object> redisTemplate,
                     ObjectMapper objectMapper,
                     CircuitBreakerRegistry circuitBreakerRegistry,
                     RetryRegistry retryRegistry) {
        this.httpClient = httpClient;
        this.props = props;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("deepseek");
        this.retry = retryRegistry.retry("deepseek");
    }

    /**
     * 文本输出调用（默认温度）
     */
    public String chatText(String userId, List<ChatMessage> messages, Integer maxTokens) {
        return chatTextDetail(userId, messages, maxTokens, null).content();
    }

    /**
     * 文本输出调用，返回内容 + token 用量，支持自定义温度
     */
    public AiResponse chatTextDetail(String userId, List<ChatMessage> messages, Integer maxTokens,
                                     Double temperature) {
        checkQuota(userId);
        try {
            return retry.executeSupplier(() ->
                    circuitBreaker.executeSupplier(() -> httpClient.chatDetail(messages, false, maxTokens, temperature)));
        } catch (Exception e) {
            log.error("AI 调用失败: {}", e.getMessage());
            throw new BizException(500, "AI 服务暂时不可用，请稍后重试");
        }
    }

    /**
     * JSON 输出调用（AI 必须返回 JSON）
     */
    public <T> T chatJson(String userId, List<ChatMessage> messages, Class<T> clazz, Integer maxTokens) {
        String content = chatText(userId, messages, maxTokens);
        return AiJsonParser.parse(content, clazz, objectMapper);
    }

    /**
     * 每日 AI 配额：Redis INCR + EXPIRE，超限抛 429
     */
    private void checkQuota(String userId) {
        if (userId == null || userId.isBlank()) {
            return;
        }
        String key = "ai:usage:" + userId + ":" + LocalDate.now();
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofDays(1));
        }
        if (count != null && count > props.getDailyLimit()) {
            throw new BizException(429, "今日 AI 调用次数已达上限");
        }
    }
}
