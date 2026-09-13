package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.aiplatform.config.AiConfigHolder;
import com.aiplatform.config.AiRuntimeConfig;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

/**
 * DeepSeek HTTP 客户端：调用 OpenAI 兼容 /chat/completions。
 *
 * 配置每次请求都从 {@link AiConfigHolder} 现读，因此管理后台改 baseUrl/apiKey/model
 * 后立即生效。**不要把 RestClient 缓存成字段** —— 那会把 baseUrl 与 apiKey 烘焙进
 * 实例，热更新就失效了（这是改造前的老写法）。
 */
@Slf4j
@Component
public class AiHttpClient {

    private final AiConfigHolder configHolder;
    private final ObjectMapper objectMapper;

    /**
     * 共享 HTTP 客户端，供流式调用使用。
     * 刻意锁 HTTP/1.1：JDK HttpClient 在 HTTP/2 下对 SSE 有缓冲行为，
     * 会让「逐字输出」退化成一次性吐出。
     */
    private final HttpClient sharedHttpClient;

    public AiHttpClient(AiConfigHolder configHolder, ObjectMapper objectMapper) {
        this.configHolder = configHolder;
        this.objectMapper = objectMapper;
        this.sharedHttpClient = HttpClient.newBuilder()
                .version(HttpClient.Version.HTTP_1_1)
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    /**
     * 发送对话请求，返回模型输出文本（默认温度）
     */
    public String chat(List<ChatMessage> messages, boolean jsonMode, Integer maxTokens) {
        return chatDetail(messages, jsonMode, maxTokens, null).content();
    }

    /**
     * 发送对话请求，返回内容 + token 用量
     */
    public AiResponse chatDetail(List<ChatMessage> messages, boolean jsonMode, Integer maxTokens,
                                 Double temperature) {
        AiRuntimeConfig cfg = configHolder.get();

        // 每次新建 factory：setReadTimeout 是有状态的可变属性，共享会串线程
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(sharedHttpClient);
        factory.setReadTimeout(Duration.ofSeconds(cfg.timeoutSeconds()));

        RestClient client = RestClient.builder()
                .baseUrl(cfg.baseUrl())
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + cfg.apiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();

        JsonNode resp = client.post()
                .uri("/chat/completions")
                .body(buildBody(cfg, messages, jsonMode, maxTokens, temperature, false))
                .retrieve()
                .body(JsonNode.class);

        if (resp == null || !resp.has("choices") || resp.get("choices").isEmpty()) {
            throw new BizException(500, "AI 服务暂时不可用，请稍后重试");
        }

        JsonNode choice = resp.path("choices").get(0);
        JsonNode message = choice.path("message");
        JsonNode usage = resp.path("usage");
        String content = message.path("content").asText("");
        String finishReason = choice.path("finish_reason").asText(null);

        if (content.isBlank()) {
            // 实测在 response_format=json_object 下，模型偶尔只返回一串空格。
            // 这里把 finish_reason 与原始响应记下来 —— 否则线上只能看到
            // 「返回内容为空」，无法判断是被截断还是模型抽风。
            log.warn("AI 返回内容为空 finishReason={} 原始响应={}",
                    finishReason, abbreviate(resp.toString(), 600));
        }

        return new AiResponse(
                content,
                usage.path("prompt_tokens").asInt(0),
                usage.path("completion_tokens").asInt(0),
                usage.path("total_tokens").asInt(0),
                finishReason);
    }

    private String abbreviate(String s, int max) {
        return s == null ? "" : (s.length() <= max ? s : s.substring(0, max) + "…");
    }

    /**
     * 发起流式请求，返回**已收到响应头**的 {@link HttpResponse}。
     *
     * send() 在收到响应头时就返回，body 是惰性消费的行流 —— 这正是
     * 「熔断只作用于建连」能够成立的物理依据：调用方先拿到响应头（此时判熔断），
     * 之后再决定如何消费 body（此阶段不再重试）。
     *
     * 状态码校验交给调用方，以便在熔断 supplier 内部抛出、让失败率被计入。
     */
    public HttpResponse<Stream<String>> openStream(List<ChatMessage> messages, Integer maxTokens,
                                                   Double temperature) throws IOException, InterruptedException {
        AiRuntimeConfig cfg = configHolder.get();
        String json = objectMapper.writeValueAsString(
                buildBody(cfg, messages, false, maxTokens, temperature, true));

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(trimTrailingSlash(cfg.baseUrl()) + "/chat/completions"))
                .timeout(Duration.ofSeconds(cfg.streamTimeoutSeconds()))
                .header("Authorization", "Bearer " + cfg.apiKey())
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .POST(HttpRequest.BodyPublishers.ofString(json, StandardCharsets.UTF_8))
                .build();

        return sharedHttpClient.send(request, HttpResponse.BodyHandlers.ofLines());
    }

    /**
     * 用**指定配置**发一次最小请求，仅用于后台「测试连接」。
     *
     * 走 max_tokens=1，把探测消耗压到最低；不读 AiConfigHolder，
     * 因此可以用来验证一份还没保存的候选配置。
     */
    public String probe(AiRuntimeConfig cfg) {
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(sharedHttpClient);
        factory.setReadTimeout(Duration.ofSeconds(cfg.timeoutSeconds()));

        RestClient client = RestClient.builder()
                .baseUrl(cfg.baseUrl())
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + cfg.apiKey())
                .defaultHeader("Content-Type", "application/json")
                .build();

        JsonNode resp = client.post()
                .uri("/chat/completions")
                .body(Map.of(
                        "model", cfg.model(),
                        "messages", List.of(Map.of("role", "user", "content", "ping")),
                        "max_tokens", 1))
                .retrieve()
                .body(JsonNode.class);

        if (resp == null || !resp.has("choices")) {
            throw new BizException(500, "响应不含 choices，可能不是 OpenAI 兼容端点");
        }
        // 服务端可能回报规范化后的模型名，回显它便于确认实际命中哪个模型
        String reported = resp.path("model").asText("");
        return reported.isBlank() ? cfg.model() : reported;
    }

    private Map<String, Object> buildBody(AiRuntimeConfig cfg, List<ChatMessage> messages, boolean jsonMode,
                                          Integer maxTokens, Double temperature, boolean stream) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", cfg.model());
        body.put("messages", messages);
        body.put("max_tokens", maxTokens != null ? maxTokens : cfg.maxTokens());
        body.put("temperature", temperature != null ? temperature : 0.7);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }
        if (stream) {
            body.put("stream", true);
            // 让最后一帧带上 usage，供用量统计使用
            body.put("stream_options", Map.of("include_usage", true));
        }
        return body;
    }

    private String trimTrailingSlash(String url) {
        return url != null && url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
