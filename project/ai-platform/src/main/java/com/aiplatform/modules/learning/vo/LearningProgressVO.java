package com.aiplatform.modules.learning.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 学习进度响应（对应接口文档 6.1 GET /api/learning/progress）
 */
@Data
public class LearningProgressVO {

    private Stats stats;
    private String currentStage;
    private List<StageVO> stages = new ArrayList<>();

    /**
     * 能力雷达：提示词五要素的近期均值（0-100）。
     * 与学习地图同源 —— 都来自对话完成时由 PromptScorer 算出的五要素分数。
     */
    private List<RadarDimension> radar = new ArrayList<>();

    @Data
    public static class Stats {
        /** 近期对话的**系统综合评分**均值 0-100，无数据时为 null（前端显示 "-"） */
        private Double averageScore;
        private Integer streakDays;
        private Integer masteredCount;
        private Integer totalConversations;
    }

    @Data
    public static class RadarDimension {
        /** role / task / context / format / constraint */
        private String key;
        private String label;
        /** 0-100；该维度无数据时为 0 */
        private Double score;
    }
}
