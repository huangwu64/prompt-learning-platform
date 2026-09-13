package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;

/**
 * AI 返回 JSON 解析。
 *
 * 模型即使被要求「只输出 JSON」，偶尔仍会加上一句解释或代码围栏。
 * 所以这里做三级兜底：直接解析 → 剥围栏 → 抓出第一个完整的 JSON 对象/数组。
 * 全部失败才报错，并且**把原文记进日志** —— 否则线上只能看到「格式异常」，无从排查。
 */
@Slf4j
public final class AiJsonParser {

    /** 失败时记入日志的原文长度上限 */
    private static final int LOG_PREVIEW_LIMIT = 500;

    private AiJsonParser() {
    }

    public static <T> T parse(String content, Class<T> clazz, ObjectMapper mapper) {
        if (content == null || content.isBlank()) {
            throw new BizException(500, "AI 返回内容为空，请重试");
        }

        String stripped = stripFence(content.strip());
        T parsed = tryParse(stripped, clazz, mapper);
        if (parsed != null) {
            return parsed;
        }

        // 模型可能在 JSON 前后夹了说明文字，抓出第一个完整的 JSON 块再试一次
        String extracted = extractJsonBlock(stripped);
        if (extracted != null) {
            parsed = tryParse(extracted, clazz, mapper);
            if (parsed != null) {
                return parsed;
            }
        }

        log.warn("AI 返回无法解析为 {}，原文前 {} 字：{}",
                clazz.getSimpleName(), LOG_PREVIEW_LIMIT, abbreviate(content, LOG_PREVIEW_LIMIT));
        throw new BizException(500, "AI 返回格式异常，请重试");
    }

    /** 解析失败返回 null 而不是抛异常，便于上层继续尝试其它策略 */
    private static <T> T tryParse(String text, Class<T> clazz, ObjectMapper mapper) {
        try {
            return mapper.readValue(text, clazz);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    /** 剥掉 ```json ... ``` 围栏 */
    private static String stripFence(String s) {
        if (!s.startsWith("```")) {
            return s;
        }
        return s.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```\\s*$", "");
    }

    /**
     * 抓出第一个括号配平的 JSON 对象或数组。
     *
     * 手写扫描而非正则：正则无法正确处理嵌套与字符串内的括号/转义。
     */
    private static String extractJsonBlock(String s) {
        int start = -1;
        char open = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '{' || c == '[') {
                start = i;
                open = c;
                break;
            }
        }
        if (start < 0) {
            return null;
        }

        char close = open == '{' ? '}' : ']';
        int depth = 0;
        boolean inString = false;
        boolean escaped = false;

        for (int i = start; i < s.length(); i++) {
            char c = s.charAt(i);
            if (inString) {
                if (escaped) {
                    escaped = false;
                } else if (c == '\\') {
                    escaped = true;
                } else if (c == '"') {
                    inString = false;
                }
                continue;
            }
            if (c == '"') {
                inString = true;
            } else if (c == open) {
                depth++;
            } else if (c == close) {
                depth--;
                if (depth == 0) {
                    return s.substring(start, i + 1);
                }
            }
        }
        return null;
    }

    private static String abbreviate(String s, int max) {
        if (s == null) {
            return "";
        }
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
}
