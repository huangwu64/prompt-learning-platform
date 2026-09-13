package com.aiplatform.modules.chat.vo;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

/**
 * 回复消息响应（对应接口文档 3.4）
 */
@Data
public class ChatTurnVO {

    /**
     * 本轮 AI 的追问。
     *
     * ⚠️ **触发「完成」的那一轮不出这个字段（为 null）** —— 此时结果在
     * improvedPrompt / comparisonResult 里。前端必须判空，
     * 曾因直接 append 导致消息列表出现 null、渲染时整页白屏。
     */
    private MessageVO message;
    /** active / completed */
    private String conversationStatus;
    private Integer currentRound;
    private Integer maxRounds;
    /** completed 时返回 */
    private String improvedPrompt;
    /** completed 时返回 */
    private JsonNode comparisonResult;
}
