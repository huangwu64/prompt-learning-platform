package com.aiplatform.modules.badges.vo;

import com.aiplatform.modules.badges.entity.Badge;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 徽章（对外，含当前用户解锁状态）
 */
@Data
public class BadgeVO {

    private String id;
    private String name;
    private String description;
    private JsonNode unlockCriteria;
    private boolean unlocked;
    private LocalDateTime unlockedAt;

    public static BadgeVO from(Badge b, LocalDateTime unlockedAt, ObjectMapper om) {
        BadgeVO vo = new BadgeVO();
        vo.setId(b.getId());
        vo.setName(b.getName());
        vo.setDescription(b.getDescription());
        vo.setUnlocked(unlockedAt != null);
        vo.setUnlockedAt(unlockedAt);
        if (b.getUnlockCriteria() != null && !b.getUnlockCriteria().isBlank()) {
            try {
                vo.setUnlockCriteria(om.readTree(b.getUnlockCriteria()));
            } catch (Exception ignored) {
                // 解析失败保持 null
            }
        }
        return vo;
    }
}
