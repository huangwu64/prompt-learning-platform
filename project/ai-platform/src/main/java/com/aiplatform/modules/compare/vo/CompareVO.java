package com.aiplatform.modules.compare.vo;

import com.aiplatform.modules.compare.entity.Comparison;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 智能对比（对外）
 */
@Data
public class CompareVO {

    private String id;
    private String originalPrompt;
    private String comparedPrompt;
    private JsonNode analysis;
    private LocalDateTime createdAt;

    public static CompareVO from(Comparison c, ObjectMapper om) {
        CompareVO vo = new CompareVO();
        vo.setId(c.getId());
        vo.setOriginalPrompt(c.getOriginalPrompt());
        vo.setComparedPrompt(c.getComparedPrompt());
        vo.setCreatedAt(c.getCreatedAt());
        if (c.getAnalysis() != null && !c.getAnalysis().isBlank()) {
            try {
                vo.setAnalysis(om.readTree(c.getAnalysis()));
            } catch (Exception ignored) {
                // 解析失败保持 null
            }
        }
        return vo;
    }
}
