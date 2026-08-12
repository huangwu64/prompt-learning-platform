package com.aiplatform.modules.chat.dto;

import lombok.Data;

/**
 * AI 回合判断结果（苏格拉底追问）
 */
@Data
public class AiTurn {

    /** ask（继续追问）/ complete（信息足够，生成优化结果） */
    private String action;

    /** action=ask 时的追问问题 */
    private String question;

    /** 信息完整度评分 0-100 */
    private Integer confidence;
}
