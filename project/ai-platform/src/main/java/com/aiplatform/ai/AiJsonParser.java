package com.aiplatform.ai;

import com.aiplatform.common.BizException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * AI 返回 JSON 解析：剥离 ```json 围栏后反序列化
 */
public final class AiJsonParser {

    private AiJsonParser() {
    }

    public static <T> T parse(String content, Class<T> clazz, ObjectMapper mapper) {
        String clean = content.strip();
        if (clean.startsWith("```")) {
            clean = clean.replaceFirst("^```(?:json)?\\s*", "").replaceFirst("\\s*```$", "");
        }
        try {
            return mapper.readValue(clean, clazz);
        } catch (JsonProcessingException e) {
            throw new BizException(500, "AI 返回格式异常，请重试");
        }
    }
}
