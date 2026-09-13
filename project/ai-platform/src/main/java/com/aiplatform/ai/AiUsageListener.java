package com.aiplatform.ai;

/**
 * AI 调用用量回调。
 *
 * 由后台监控模块提供实现并把用量落库（ai_usage_daily），供趋势统计使用；
 * 尚未注册实现时 AiGateway 用 NOOP 兜底，主链路不受影响。
 *
 * 实现方必须自行保证**不阻塞、不抛异常**：它跑在 AI 调用的 finally 里。
 */
public interface AiUsageListener {

    /** 空实现：未接入用量落库时使用 */
    AiUsageListener NOOP = (userId, scope, success, response, costMs) -> {
    };

    /**
     * @param response 成功时为模型返回内容与 token 用量；失败时为 null
     */
    void onCall(String userId, String scope, boolean success, AiResponse response, long costMs);
}
