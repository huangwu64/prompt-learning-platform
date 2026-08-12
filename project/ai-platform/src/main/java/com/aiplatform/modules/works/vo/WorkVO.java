package com.aiplatform.modules.works.vo;

import com.aiplatform.modules.works.entity.Work;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 作品（对外）
 */
@Data
public class WorkVO {

    private String id;
    private String workType;
    private String title;
    private String content;
    private JsonNode formData;
    private String shareUrl;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static WorkVO from(Work w, ObjectMapper om) {
        WorkVO vo = new WorkVO();
        vo.setId(w.getId());
        vo.setWorkType(w.getWorkType());
        vo.setTitle(w.getTitle());
        vo.setContent(w.getContent());
        vo.setShareUrl(w.getShareUrl());
        vo.setCreatedAt(w.getCreatedAt());
        vo.setUpdatedAt(w.getUpdatedAt());
        if (w.getFormData() != null && !w.getFormData().isBlank()) {
            try {
                vo.setFormData(om.readTree(w.getFormData()));
            } catch (Exception ignored) {
                // 解析失败保持 null
            }
        }
        return vo;
    }
}
