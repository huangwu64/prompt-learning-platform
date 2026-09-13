package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.aiplatform.config.AiConfigHolder;
import com.aiplatform.config.AiRuntimeConfig;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.Retry;
import io.github.resilience4j.retry.RetryRegistry;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.Stream;

/**
 * AI 网关：全站唯一 AI 出口。
 * 统一：分场景每日配额（Redis）、熔断与重试（Resilience4j）、JSON 解析、错误降级、用量回调。
 */
@Slf4j
@Service
public class AiGateway {

    /**
     * JSON 抽取用的采样温度。
     *
     * 默认的 0.7 是给创作类场景的；结构化抽取应当接近确定性，所以这里用低温。
     *
     * 说明：它**不是**「返回内容为空」的修复手段。曾怀疑空白是高温采样导致的抖动，
     * 实测用同一上下文在 0.2 下仍 3/3 返回空白 —— 那其实是上下文结构问题
     * （见 ChatService.buildTurnPrompt 的注释）。此处低温只是这类任务的常规选择。
     */
    private static final double JSON_TEMPERATURE = 0.2;

    /** 流式增量回调。抛出 IOException 表示下游（客户端）已断开 */
    @FunctionalInterface
    public interface StreamSink {
        void onDelta(String delta) throws IOException;
    }

    private final AiHttpClient httpClient;
    private final AiConfigHolder configHolder;
    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;
    private final CircuitBreaker circuitBreaker;
    private final Retry retry;
    private final MeterRegistry meterRegistry;
    private final ObjectProvider<AiUsageListener> usageListenerProvider;

    public AiGateway(AiHttpClient httpClient,
                     AiConfigHolder configHolder,
                     RedisTemplate<String, Object> redisTemplate,
                     ObjectMapper objectMapper,
                     CircuitBreakerRegistry circuitBreakerRegistry,
                     RetryRegistry retryRegistry,
                     MeterRegistry meterRegistry,
                     ObjectProvider<AiUsageListener> usageListenerProvider) {
        this.httpClient = httpClient;
        this.configHolder = configHolder;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.circuitBreaker = circuitBreakerRegistry.circuitBreaker("deepseek");
        this.retry = retryRegistry.retry("deepseek");
        this.meterRegistry = meterRegistry;
        this.usageListenerProvider = usageListenerProvider;
    }

    // ==================== 非流式 ====================

    /**
     * 文本输出调用（默认温度）
     */
    public String chatText(String userId, String scope, List<ChatMessage> messages, Integer maxTokens) {
        return chatTextDetail(userId, scope, messages, maxTokens, null).content();
    }

    /**
     * 文本输出调用，返回内容 + token 用量，支持自定义温度
     */
    public AiResponse chatTextDetail(String userId, String scope, List<ChatMessage> messages,
                                     Integer maxTokens, Double temperature) {
        return doChat(userId, scope, messages, maxTokens, temperature, false);
    }

    /**
     * JSON 输出调用（AI 必须返回 JSON）
     *
     * jsonMode=true 会带上 <code>response_format: {"type":"json_object"}</code>，
     * 由**服务端**约束模型只输出 JSON —— 这是除 AiJsonParser 之外的第二道保险。
     *
     * ⚠️ 该方法此前一直传 false，等于这道保险形同虚设：模型可以随意输出自然语言，
     * 解析失败就整条链路 500。修 prompt 的同时把这里也接上。
     */
    public <T> T chatJson(String userId, String scope, List<ChatMessage> messages, Class<T> clazz,
                          Integer maxTokens) {
        AiResponse resp = doChat(userId, scope, messages, maxTokens, JSON_TEMPERATURE, true);

        // 兜底重试：模型返回空白内容时再试一次。
        // 已知的那个确定性空白已由上下文压平解决（见 ChatService.buildTurnPrompt），
        // 这里只是以防万一 —— 空白时重试的代价仅一次调用。
        if (resp.empty()) {
            log.warn("AI 返回空白内容，重试一次 scope={} finishReason={}", scope, resp.finishReason());
            resp = doChat(userId, scope, messages, maxTokens, JSON_TEMPERATURE, true);
        }
        return AiJsonParser.parse(resp.content(), clazz, objectMapper);
    }

    /** 文本与 JSON 两条路径共用的调用主体，差异只在 jsonMode */
    private AiResponse doChat(String userId, String scope, List<ChatMessage> messages,
                              Integer maxTokens, Double temperature, boolean jsonMode) {
        checkQuota(userId, scope);
        long start = System.currentTimeMillis();
        boolean success = false;
        AiResponse result = null;
        try {
            AiResponse resp = retry.executeSupplier(() ->
                    circuitBreaker.executeSupplier(() ->
                            httpClient.chatDetail(messages, jsonMode, maxTokens, temperature)));
            result = resp;
            success = true;
            log.info("AI 调用成功 scope={} jsonMode={} cost={}ms", scope, jsonMode,
                    System.currentTimeMillis() - start);
            return resp;
        } catch (Exception e) {
            log.error("AI 调用失败 scope={} cost={}ms: {}", scope, System.currentTimeMillis() - start, e.getMessage());
            throw new BizException(500, "AI 服务暂时不可用，请稍后重试");
        } finally {
            recordCall(userId, scope, success, result, System.currentTimeMillis() - start);
        }
    }

    // ==================== 流式 ====================

    /**
     * 流式调用：逐 token 回调 sink，返回聚合后的完整结果。
     *
     * **熔断边界**：只有「建连」进熔断与重试。拿到响应头之后就不再重试 ——
     * 因为此时可能已经吐出了一部分 token，重试会让用户看到重复内容。
     * 改造前的写法是 retry 包住整个调用，用于流式会产生重复输出。
     */
    public AiResponse chatStream(String userId, String scope, List<ChatMessage> messages,
                                 Integer maxTokens, Double temperature, StreamSink sink) {
        checkQuota(userId, scope);
        long start = System.currentTimeMillis();
        boolean success = false;
        AiResponse result = null;
        try {
            HttpResponse<Stream<String>> resp = retry.executeSupplier(() ->
                    circuitBreaker.executeSupplier(() -> openStreamOrThrow(messages, maxTokens, temperature)));

            result = consumeStream(resp.body(), sink);
            success = true;
            log.info("AI 流式调用成功 scope={} cost={}ms chars={}", scope,
                    System.currentTimeMillis() - start, result.content().length());
            return result;
        } catch (BizException e) {
            log.error("AI 流式调用失败 scope={} cost={}ms: {}", scope, System.currentTimeMillis() - start, e.getMessage());
            throw e;
        } catch (Exception e) {
            log.error("AI 流式调用失败 scope={} cost={}ms: {}", scope, System.currentTimeMillis() - start, e.getMessage());
            throw new BizException(500, "AI 服务暂时不可用，请稍后重试");
        } finally {
            recordCall(userId, scope, success, result, System.currentTimeMillis() - start);
        }
    }

    /**
     * 建连 + 状态码校验。
     * 状态码异常**必须在这里抛**（即熔断 supplier 内部），否则失败率不计入、熔断永不触发。
     */
    private HttpResponse<Stream<String>> openStreamOrThrow(List<ChatMessage> messages, Integer maxTokens,
                                                           Double temperature) {
        try {
            HttpResponse<Stream<String>> resp = httpClient.openStream(messages, maxTokens, temperature);
            if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
                throw new BizException(500, "AI 服务返回状态码 " + resp.statusCode());
            }
            return resp;
        } catch (IOException e) {
            throw new BizException(500, "AI 服务连接失败: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new BizException(500, "AI 服务连接被中断");
        }
    }

    /**
     * 消费 SSE 行流（OpenAI 兼容协议）：
     *   data: {"choices":[{"delta":{"content":"你"}}]}   ← 增量
     *   data: {"usage":{...}}                            ← 末帧用量
     *   data: [DONE]                                     ← 结束
     *   : ping                                           ← 心跳注释
     */
    private AiResponse consumeStream(Stream<String> lines, StreamSink sink) throws IOException {
        StringBuilder content = new StringBuilder();
        int promptTokens = 0;
        int completionTokens = 0;
        int totalTokens = 0;
        String finishReason = null;

        try (lines) {
            for (String line : (Iterable<String>) lines::iterator) {
                if (line == null || line.isEmpty() || line.startsWith(":")) {
                    continue;   // 空行 / 心跳注释
                }
                if (!line.startsWith("data:")) {
                    continue;
                }
                String data = line.substring(5).trim();
                if (data.isEmpty()) {
                    continue;
                }
                if ("[DONE]".equals(data)) {
                    break;
                }

                JsonNode node;
                try {
                    node = objectMapper.readTree(data);
                } catch (JsonProcessingException e) {
                    // 单帧解析失败不应中断整个流
                    log.warn("跳过无法解析的 SSE 帧: {}", e.getOriginalMessage());
                    continue;
                }

                JsonNode usage = node.path("usage");
                if (usage.isObject()) {
                    promptTokens = usage.path("prompt_tokens").asInt(promptTokens);
                    completionTokens = usage.path("completion_tokens").asInt(completionTokens);
                    totalTokens = usage.path("total_tokens").asInt(totalTokens);
                }

                JsonNode fr = node.path("choices").path(0).path("finish_reason");
                if (fr.isTextual()) {
                    finishReason = fr.asText();
                }

                // 注意是 delta 不是 message；usage-only 帧的 choices 为空数组，path 会安全返回缺失节点
                JsonNode delta = node.path("choices").path(0).path("delta").path("content");
                if (delta.isTextual()) {
                    String text = delta.asText();
                    if (!text.isEmpty()) {
                        content.append(text);
                        sink.onDelta(text);
                    }
                }
            }
        }
        return new AiResponse(content.toString(), promptTokens, completionTokens, totalTokens, finishReason);
    }

    // ==================== 配额与用量 ====================

    /**
     * 分场景每日配额：Redis INCR + EXPIRE，超限抛 429。
     *
     * key 带 scope 段，因此助手与苏格拉底互不挤占。
     * Redis 故障时 **fail-open**（放行）：可用性优先，不能让 Redis 挂掉就全站 AI 停摆。
     */
    private void checkQuota(String userId, String scope) {
        AiRuntimeConfig cfg = configHolder.get();

        // 后台可一键关闭 AI：所有场景一律拒绝，避免"关了还在烧额度"
        if (!cfg.enabled()) {
            throw new BizException(503, "AI 服务已由管理员关闭");
        }
        if (userId == null || userId.isBlank()) {
            return;
        }
        int limit = AiScope.ASSISTANT.equals(scope) ? cfg.assistantDailyLimit() : cfg.dailyLimit();

        // limit <= 0 表示**不限量**（开发 / 联调 / 压测场景），
        // 直接返回、连计数器都不写 —— 免得白跑一次 Redis 写。
        if (limit <= 0) {
            return;
        }

        String key = "ai:usage:" + scope + ":" + userId + ":" + LocalDate.now();
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, Duration.ofDays(1));
            }
            if (count != null && count > limit) {
                throw new BizException(429, "今日 AI 调用次数已达上限");
            }
        } catch (BizException e) {
            throw e;   // 超限是业务结果，不是故障
        } catch (Exception e) {
            log.warn("配额检查失败，放行本次调用 scope={} userId={}: {}", scope, userId, e.getMessage());
        }
    }

    /** 指标 + 用量回调。跑在 finally 里，任何异常都不得影响主流程 */
    private void recordCall(String userId, String scope, boolean success, AiResponse resp, long costMs) {
        try {
            meterRegistry.counter("ai.calls",
                    "provider", "deepseek",
                    "scope", scope,
                    "result", success ? "success" : "failure").increment();
            meterRegistry.timer("ai.latency", "provider", "deepseek", "scope", scope)
                    .record(Duration.ofMillis(costMs));
            usageListenerProvider.getIfAvailable(() -> AiUsageListener.NOOP)
                    .onCall(userId, scope, success, resp, costMs);
        } catch (Exception e) {
            log.warn("用量记录失败（不影响主流程）: {}", e.getMessage());
        }
    }
}
