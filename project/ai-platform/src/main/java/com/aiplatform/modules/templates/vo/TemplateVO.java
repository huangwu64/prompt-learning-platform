package com.aiplatform.modules.templates.vo;

import com.aiplatform.modules.templates.entity.Template;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 模板（对外）
 */
@Data
public class TemplateVO {

    private String id;
    private String name;
    private JsonNode blocks;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static TemplateVO from(Template t, ObjectMapper om) {
        TemplateVO vo = new TemplateVO();
        vo.setId(t.getId());
        vo.setName(t.getName());
        vo.setCreatedAt(t.getCreatedAt());
        vo.setUpdatedAt(t.getUpdatedAt());
        if (t.getBlocks() != null && !t.getBlocks().isBlank()) {
            try {
                vo.setBlocks(om.readTree(t.getBlocks()));
            } catch (Exception ignored) {
                // 解析失败保持 null
            }
        }
        return vo;
    }
}
