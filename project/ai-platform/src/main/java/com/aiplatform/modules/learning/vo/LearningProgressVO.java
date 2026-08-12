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

    @Data
    public static class Stats {
        /** 最近对话平均分，无对话时为 null（前端显示 "-"） */
        private Double averageRating;
        private Integer streakDays;
        private Integer masteredCount;
        private Integer totalConversations;
    }
}
