package com.aiplatform.modules.learning.vo;

import lombok.Data;

/**
 * 进度更新结果（内部方法返回，由 chat 的**系统综合评分**联动）
 */
@Data
public class UpdateProgressVO {

    /** locked / learning / mastered */
    private String status;

    /** 历史最好成绩，0-100 */
    private Float bestScore;
    private boolean stageUnlocked;
}
