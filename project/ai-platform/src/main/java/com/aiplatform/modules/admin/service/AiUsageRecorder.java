package com.aiplatform.modules.admin.service;

import com.aiplatform.ai.AiResponse;
import com.aiplatform.ai.AiUsageListener;
import com.aiplatform.modules.admin.mapper.AiUsageMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * AI 用量落库：实现 {@link AiUsageListener}，把每次调用累加到 ai_usage_daily。
 *
 * 由 AiGateway 在 finally 里调用，所以这里**只做入队**，真正的写库在后台线程完成。
 */
@Component
public class AiUsageRecorder extends QueuedRecorder<AiUsageRecorder.Usage>
        implements AiUsageListener {

    private static final int QUEUE_CAPACITY = 2000;
    /** 没有登录态的调用（理论上不该有）归到这个桶，避免撞 NOT NULL 约束 */
    private static final String ANONYMOUS = "anonymous";

    private final AiUsageMapper usageMapper;

    public AiUsageRecorder(AiUsageMapper usageMapper) {
        super("ai-usage-recorder", QUEUE_CAPACITY);
        this.usageMapper = usageMapper;
    }

    @Override
    public void onCall(String userId, String scope, boolean success, AiResponse response, long costMs) {
        enqueue(new Usage(
                userId == null || userId.isBlank() ? ANONYMOUS : userId,
                scope,
                success,
                response == null ? 0 : response.promptTokens(),
                response == null ? 0 : response.completionTokens(),
                response == null ? 0 : response.totalTokens(),
                costMs));
    }

    @Override
    protected void persist(Usage u) {
        usageMapper.upsertDaily(
                u.userId, LocalDate.now(), u.scope,
                u.success ? 1 : 0,
                u.success ? 0 : 1,
                u.promptTokens, u.completionTokens, u.totalTokens, u.costMs);
    }

    @Override
    protected String describe(Usage u) {
        return "AI 用量(" + u.scope + ")";
    }

    /** 一次调用的用量快照 */
    record Usage(String userId, String scope, boolean success,
                 int promptTokens, int completionTokens, int totalTokens, long costMs) {
    }
}
