package com.aiplatform.modules.admin.vo;

/**
 * 「测试连接」结果。
 *
 * 失败不抛异常而是 ok=false —— 试连不通常见且可预期，用 200 + 结构化结果
 * 让前端直接把原因显示出来，比一个 500 友好得多。
 */
public record AiConfigTestVO(boolean ok, int latencyMs, String model, String error) {

    public static AiConfigTestVO success(int latencyMs, String model) {
        return new AiConfigTestVO(true, latencyMs, model, null);
    }

    public static AiConfigTestVO failure(int latencyMs, String error) {
        return new AiConfigTestVO(false, latencyMs, null, error);
    }
}
