package com.aiplatform.ai;

/**
 * AI 调用场景。用于配额分账与监控归因。
 *
 * 配额 key 会带上 scope 段（ai:usage:{scope}:{userId}:{date}），
 * 因此助手不会和苏格拉底抢每日 50 次，各场景用量也能分别统计。
 */
public final class AiScope {

    /** 苏格拉底对话 */
    public static final String SOCRATIC = "socratic";

    /** 全局 AI 助手（走独立的 assistantDailyLimit） */
    public static final String ASSISTANT = "assistant";

    /** 工具类一次性生成：作品工厂 / 智能对比 / 提示词实验室 */
    public static final String TOOLS = "tools";

    private AiScope() {
    }
}
