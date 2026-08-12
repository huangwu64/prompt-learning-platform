package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.aiplatform.config.AiProperties;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * DeepSeek HTTP 客户端：调用 OpenAI 兼容 /chat/completions
 */
@Component
public class AiHttpClient {

    private final RestClient restClient;
    private final AiProperties props;

    public AiHttpClient(AiProperties props) {
        this.props = props;

        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofSeconds(props.getDeepseek().getTimeoutSeconds()));

        this.restClient = RestClient.builder()
                .baseUrl(props.getDeepseek().getBaseUrl())
                .requestFactory(factory)
                .defaultHeader("Authorization", "Bearer " + props.getDeepseek().getApiKey())
                .defaultHeader("Content-Type", "application/json")
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
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.getDeepseek().getModel());
        body.put("messages", messages);
        body.put("max_tokens", maxTokens != null ? maxTokens : props.getDeepseek().getMaxTokens());
        body.put("temperature", temperature != null ? temperature : 0.7);
        if (jsonMode) {
            body.put("response_format", Map.of("type", "json_object"));
        }

        JsonNode resp = restClient.post()
                .uri("/chat/completions")
                .body(body)
                .retrieve()
                .body(JsonNode.class);

        if (resp == null || !resp.has("choices") || resp.get("choices").isEmpty()) {
            throw new BizException(500, "AI 服务暂时不可用，请稍后重试");
        }
        JsonNode message = resp.path("choices").get(0).path("message");
        JsonNode usage = resp.path("usage");
        return new AiResponse(
                message.path("content").asText(),
                usage.path("prompt_tokens").asInt(0),
                usage.path("completion_tokens").asInt(0),
                usage.path("total_tokens").asInt(0));
    }
}
