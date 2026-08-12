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
     * 发送对话请求，返回模型输出文本
     */
    public String chat(List<ChatMessage> messages, boolean jsonMode, Integer maxTokens) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", props.getDeepseek().getModel());
        body.put("messages", messages);
        body.put("max_tokens", maxTokens != null ? maxTokens : props.getDeepseek().getMaxTokens());
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
        return resp.path("choices").get(0).path("message").path("content").asText();
    }
}
