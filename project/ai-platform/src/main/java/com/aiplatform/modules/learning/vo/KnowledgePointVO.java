package com.aiplatform.modules.learning.vo;

import lombok.Data;

/**
 * 知识点进度（对外）
 */
@Data
public class KnowledgePointVO {

    private String id;
    private String name;
    /** locked / learning / mastered */
    private String status;

    /**
     * 该知识点的历史最好成绩，口径为**系统综合评分 0-100**。
     *
     * 原名 bestRating（1-5 星）—— 改造后掌握度不再由用户星级决定，
     * 故对外改名以免误读。底层列名仍是 best_rating（历史遗留，未做 DDL 重命名）。
     */
    private Float bestScore;
}
