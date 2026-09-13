package com.aiplatform.modules.learning.config;

import com.aiplatform.modules.learning.entity.KnowledgePoint;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 学习地图静态配置：四阶段顺序、阶段解锁阈值、知识点清单（seed 数据源）
 */
public final class LearningConfig {

    private LearningConfig() {
    }

    public static final String[] STAGE_ORDER =
            {"beginner", "intermediate", "advanced", "master"};

    public static final Map<String, String> STAGE_NAMES = Map.of(
            "beginner", "入门",
            "intermediate", "进阶",
            "advanced", "精通",
            "master", "大师");

    /**
     * 各阶段的掌握阈值，口径为**系统综合评分 0-100**。
     *
     * 原先这里是 1-5 星口径（3.5 / 3.5 / 4.0 / 4.5），因为当时掌握度由用户的
     * 满意度星级决定。改造后学习分改为系统按「完整度 + 轮数」计算的综合评分，
     * 阈值同步 ×20 换算（见 V8 迁移）。
     */
    public static final Map<String, Float> STAGE_THRESHOLD = Map.of(
            "beginner", 70f,
            "intermediate", 70f,
            "advanced", 80f,
            "master", 90f);

    /** 知识点清单：阶段内知识点全掌握 + 平均分达标 → 解锁下一阶段 */
    public static List<KnowledgePoint> knowledgePoints() {
        List<KnowledgePoint> list = new ArrayList<>();
        add(list, "beginner", "角色设定", 0);
        add(list, "beginner", "任务描述", 1);
        add(list, "beginner", "上下文", 2);
        add(list, "beginner", "输出格式", 3);
        add(list, "beginner", "约束条件", 4);
        add(list, "intermediate", "思维链", 0);
        add(list, "intermediate", "多轮对话", 1);
        add(list, "intermediate", "自我反思", 2);
        add(list, "advanced", "代码提示词", 0);
        add(list, "advanced", "写作提示词", 1);
        add(list, "advanced", "分析提示词", 2);
        add(list, "master", "复杂工作流", 0);
        add(list, "master", "模型性能优化", 1);
        return list;
    }

    private static void add(List<KnowledgePoint> list, String stage, String name, int order) {
        KnowledgePoint kp = new KnowledgePoint();
        kp.setStage(stage);
        kp.setName(name);
        kp.setSortOrder(order);
        kp.setUnlockThreshold(STAGE_THRESHOLD.get(stage));
        list.add(kp);
    }
}
