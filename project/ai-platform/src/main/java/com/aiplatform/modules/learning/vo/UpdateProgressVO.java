package com.aiplatform.modules.learning.vo;

import lombok.Data;

/**
 * 进度更新结果（内部方法返回，由 chat 评分联动）
 */
@Data
public class UpdateProgressVO {

    /** locked / learning / mastered */
    private String status;
    private Float bestRating;
    private boolean stageUnlocked;
}
