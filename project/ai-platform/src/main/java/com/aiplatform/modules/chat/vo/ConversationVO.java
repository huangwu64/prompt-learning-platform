package com.aiplatform.modules.chat.vo;

import com.aiplatform.modules.chat.entity.Conversation;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 对话（对外）
 */
@Data
public class ConversationVO {

    private String id;
    private String originalPrompt;
    private String improvedPrompt;
    /** 改进分析（JSON 对象，null 表示尚未完成） */
    private JsonNode comparisonResult;
    private Integer rating;
    private String status;
    private Integer currentRound;
    private Integer maxRounds;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ConversationVO from(Conversation c, ObjectMapper om) {
        ConversationVO vo = new ConversationVO();
        vo.setId(c.getId());
        vo.setOriginalPrompt(c.getOriginalPrompt());
        vo.setImprovedPrompt(c.getImprovedPrompt());
        vo.setRating(c.getRating());
        vo.setStatus(c.getStatus());
        vo.setCurrentRound(c.getCurrentRound());
        vo.setMaxRounds(c.getMaxRounds());
        vo.setCreatedAt(c.getCreatedAt());
        vo.setUpdatedAt(c.getUpdatedAt());
        if (c.getComparisonResult() != null && !c.getComparisonResult().isBlank()) {
            try {
                vo.setComparisonResult(om.readTree(c.getComparisonResult()));
            } catch (Exception ignored) {
                // 解析失败保持 null
            }
        }
        return vo;
    }
}
