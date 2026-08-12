package com.aiplatform.modules.chat.vo;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

/**
 * 回复消息响应（对应接口文档 3.4）
 */
@Data
public class ChatTurnVO {

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
