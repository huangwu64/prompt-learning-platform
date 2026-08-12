package com.aiplatform.modules.lab.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 测试提示词响应（对应接口文档 4.1）
 */
@Data
@AllArgsConstructor
public class LabTestVO {

    private String result;
    private String model;
    private Usage usage;
    private double duration;

    @Data
    @AllArgsConstructor
    public static class Usage {
        private int promptTokens;
        private int completionTokens;
        private int totalTokens;
    }
}
