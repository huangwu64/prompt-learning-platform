package com.aiplatform.modules.compare.dto;

import lombok.Data;

import java.util.List;

/**
 * AI 对比分析结果
 */
@Data
public class AiCompare {

    private List<Improvement> improvements;

    private ScoreComparison scoreComparison;

    @Data
    public static class Improvement {
        private String dimension;
        private String original;
        private String improved;
        /** high / medium / low */
        private String impact;
    }

    @Data
    public static class ScoreComparison {
        private Integer originalScore;
        private Integer comparedScore;
        private Integer improvement;
    }
}
