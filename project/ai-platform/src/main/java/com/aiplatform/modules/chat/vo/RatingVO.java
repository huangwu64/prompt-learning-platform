package com.aiplatform.modules.chat.vo;

import lombok.Data;

/**
 * 对话评分响应
 */
@Data
public class RatingVO {

    private String conversationId;

    /** 用户刚提交的满意度星级 1-5 */
    private Integer rating;

    /** 近期对话的**系统综合评分**均值 0-100（注意不是星级均值） */
    private Double averageScore;

    private Integer masteredTopics;
}
