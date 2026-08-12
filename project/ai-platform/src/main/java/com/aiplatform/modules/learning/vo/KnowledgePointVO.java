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
    private Float bestRating;
}
