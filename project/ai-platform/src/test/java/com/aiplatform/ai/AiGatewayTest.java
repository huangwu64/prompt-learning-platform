package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.aiplatform.config.AiConfigHolder;
import com.aiplatform.config.AiRuntimeConfig;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import io.github.resilience4j.retry.RetryRegistry;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.net.http.HttpResponse;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

/**
 * AI 网关单元测试 —— 重点覆盖流式 SSE 解析（本模块风险最高的新代码）。
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AiGatewayTest {

    private static final AiRuntimeConfig CFG = new AiRuntimeConfig(
            "https://api.deepseek.com", "sk-test", "deepseek-chat", 30, 120, 2048, 50, 100, true);

    @Mock
    private AiHttpClient httpClient;
    @Mock
    private AiConfigHolder configHolder;
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private ValueOperations<String, Object> valueOperations;
    @Mock
    private MeterRegistry meterRegistry;
    @Mock
    private Counter counter;
    @Mock
    private ObjectProvider<AiUsageListener> usageListenerProvider;
    @Mock
    private HttpResponse<Stream<String>> response;

    private AiGateway gateway;

    @BeforeEach
    void setUp() {
        when(configHolder.get()).thenReturn(CFG);
        when(meterRegistry.counter(anyString(), any(String[].class))).thenReturn(counter);
        when(usageListenerProvider.getIfAvailable(any())).thenReturn(AiUsageListener.NOOP);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.increment(anyString())).thenReturn(1L);

        gateway = new AiGateway(httpClient, configHolder, redisTemplate, new ObjectMapper(),
                CircuitBreakerRegistry.ofDefaults(), RetryRegistry.ofDefaults(),
                meterRegistry, usageListenerProvider);
    }

    private void stubStream(Stream<String> lines) throws Exception {
        when(response.statusCode()).thenReturn(200);
        when(response.body()).thenReturn(lines);
        when(httpClient.openStream(anyList(), any(), any())).thenReturn(response);
    }

    @Test
    void chatStream_parsesDeltasAndUsage() throws Exception {
        stubStream(Stream.of(
                ": ping",
                "",
                "data: {\"choices\":[{\"delta\":{\"content\":\"你\"}}]}",
                "data: {\"choices\":[{\"delta\":{\"content\":\"好\"}}]}",
                "data: {\"choices\":[],\"usage\":{\"prompt_tokens\":10,\"completion_tokens\":2,\"total_tokens\":12}}",
                "data: [DONE]"));

        StringBuilder streamed = new StringBuilder();
        AiResponse resp = gateway.chatStream("user_1", AiScope.ASSISTANT,
                List.of(ChatMessage.user("hi")), 100, null, streamed::append);

        assertEquals("你好", resp.content());
        assertEquals("你好", streamed.toString(), "增量回调应拼出与聚合结果相同的内容");
        assertEquals(10, resp.promptTokens());
        assertEquals(2, resp.completionTokens());
        assertEquals(12, resp.totalTokens());
    }

    @Test
    void chatStream_skipsMalformedFramesAndStopsAtDone() throws Exception {
        stubStream(Stream.of(
                ": ping",
                "data: not-json-at-all{",
                "data: {\"choices\":[{\"delta\":{\"content\":\"A\"}}]}",
                "data: [DONE]",
                "data: {\"choices\":[{\"delta\":{\"content\":\"不应出现\"}}]}"));

        AiResponse resp = gateway.chatStream("user_1", AiScope.ASSISTANT,
                List.of(ChatMessage.user("hi")), 100, null, delta -> {
                });

        // 单帧解析失败被跳过；[DONE] 之后的帧不再消费
        assertEquals("A", resp.content());
    }

    @Test
    void chatStream_quotaExceeded_throws429WithoutCallingProvider() {
        when(valueOperations.increment(anyString())).thenReturn(51L);   // 超过 socratic 的 50

        BizException ex = assertThrows(BizException.class, () ->
                gateway.chatStream("user_1", AiScope.SOCRATIC,
                        List.of(ChatMessage.user("hi")), 100, null, delta -> {
                        }));

        assertEquals(429, ex.getStatus());
        verifyNoInteractions(httpClient);
    }

    @Test
    void chatStream_assistantScopeUsesItsOwnHigherLimit() throws Exception {
        stubStream(Stream.of("data: [DONE]"));
        when(valueOperations.increment(anyString())).thenReturn(51L);   // 超过 50，但助手上限是 100

        AiResponse resp = gateway.chatStream("user_1", AiScope.ASSISTANT,
                List.of(ChatMessage.user("hi")), 100, null, delta -> {
                });

        assertEquals("", resp.content(), "助手走独立配额，51 次不应被拦");
    }

    /** chatJson 的解析目标 */
    record Sample(String question) {
    }

    @Test
    void chatJson_retriesOnceWhenModelReturnsBlank() {
        // 锁住一个真实复现过的坑：response_format=json_object 下模型偶尔只返回一串空白
        // （抓到的原始响应是 11 个空格）。空白 → 重试一次。
        AiResponse blank = new AiResponse("           ", 10, 11, 21, "stop");
        AiResponse good = new AiResponse("{\"question\":\"收件人是谁？\"}", 10, 8, 18, "stop");
        when(httpClient.chatDetail(anyList(), eq(true), any(), any())).thenReturn(blank, good);

        Sample result = gateway.chatJson("user_1", AiScope.SOCRATIC,
                List.of(ChatMessage.user("帮我写个邮件")), Sample.class, 100);

        assertEquals("收件人是谁？", result.question());
        verify(httpClient, times(2)).chatDetail(anyList(), eq(true), any(), any());
    }

    @Test
    void chatStream_providerErrorStatus_throws500() throws Exception {
        when(response.statusCode()).thenReturn(500);
        when(httpClient.openStream(anyList(), any(), any())).thenReturn(response);

        BizException ex = assertThrows(BizException.class, () ->
                gateway.chatStream("user_1", AiScope.ASSISTANT,
                        List.of(ChatMessage.user("hi")), 100, null, delta -> {
                        }));

        assertEquals(500, ex.getStatus());
    }
}
