package com.aiplatform.modules.badges.config;

import com.aiplatform.modules.badges.entity.Badge;

import java.util.List;

/**
 * 徽章定义 seed 数据
 */
public final class BadgeConfig {

    private BadgeConfig() {
    }

    public static List<Badge> badges() {
        return List.of(
                badge("连续打卡7天", "连续 7 天完成至少一次对话练习", "{\"type\":\"streak\",\"target\":7}"),
                badge("对话小达人", "累计完成 10 次苏格拉底对话练习", "{\"type\":\"conversation_count\",\"target\":10}"),
                badge("首次评分", "完成第一次对话评分", "{\"type\":\"first_rating\",\"target\":1}"),
                badge("入门完成", "完成入门阶段所有知识点", "{\"type\":\"stage_complete\",\"target\":1}"),
                badge("作品高产", "累计创建 10 个作品", "{\"type\":\"works_count\",\"target\":10}"));
    }

    private static Badge badge(String name, String description, String criteria) {
        Badge b = new Badge();
        b.setName(name);
        b.setDescription(description);
        b.setUnlockCriteria(criteria);
        return b;
    }
}
