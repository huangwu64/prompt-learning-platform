package com.aiplatform.modules.chat.vo;

import lombok.Data;

/**
 * 对话评分响应
 */
@Data
public class RatingVO {

    private String conversationId;
    private Integer rating;
    private Double averageRating;
    private Integer masteredTopics;
}
