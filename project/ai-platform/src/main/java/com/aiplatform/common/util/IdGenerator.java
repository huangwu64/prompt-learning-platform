package com.aiplatform.common.util;

import java.util.UUID;

/**
 * 主键生成工具：`{业务前缀}_{UUID片段}`，如 conv_a3b4c5d6e7f8
 */
public final class IdGenerator {

    private IdGenerator() {
    }

    public static String generate(String prefix) {
        String uuid = UUID.randomUUID().toString().replace("-", "");
        return prefix + "_" + uuid.substring(0, 12);
    }
}
