package com.aiplatform.modules.chat.scoring;

import com.aiplatform.modules.chat.entity.Message;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * 提示词五要素评分器（系统权威评分）。
 *
 * 口径：角色设定 / 任务描述 / 上下文 / 输出格式 / 约束条件，每要素满分 20 分，合计 100 分 = **完整度**。
 * 综合评分 = 完整度 × 70% + 轮数效率 × 30%。
 *
 * ⚠️ **本类是前端 `src/lib/promptScoring.ts` 的逐条移植，两者必须保持一致。**
 * 为什么要有两份：
 *   - 前端那份用于对话进行中的**实时预估**（每敲一个字都请求后端不现实）
 *   - 本类用于对话完成时的**权威算分**，结果落库并驱动学习地图与能力雷达
 * 改动任意一份时请同步另一份，否则会出现「实时面板显示 80，完成后变成 60」的割裂。
 */
@Component
public class PromptScorer {

    /** 完整度权重 */
    private static final double COMPLETENESS_WEIGHT = 0.7;
    /** 轮数权重 */
    private static final double ROUNDS_WEIGHT = 0.3;
    /** 轮数效率的下限分：用满全部轮次仍得 60 分 —— 走完全程是正常路径，不该被重罚 */
    private static final double EFFICIENCY_FLOOR = 60.0;

    /** 一个要素的判定词表：strong 命中得满分，weak 命中得半分 */
    private record ElementMeta(String key, String label, List<String> strong, List<String> weak) {
    }

    private static final List<ElementMeta> ELEMENTS = List.of(
            new ElementMeta("role", "角色设定",
                    List.of("扮演", "你是一位", "你是一个", "你作为", "作为", "以……的身份", "以一名",
                            "角色", "身份", "专家", "教练", "agent", "as a"),
                    List.of("人设", "口吻", "请以", "定位")),
            new ElementMeta("task", "任务描述",
                    List.of("帮我", "请帮我", "完成", "生成", "撰写", "制作", "总结", "翻译", "分析",
                            "设计", "提炼", "改写", "规划", "评估", "目标", "任务"),
                    List.of("想要", "想得到", "希望")),
            new ElementMeta("context", "上下文",
                    List.of("背景", "上下文", "现状", "场景", "资料", "数据", "人群", "对象", "面向",
                            "在……", "参考", "前情"),
                    List.of("相关", "语境", "行业")),
            new ElementMeta("format", "输出格式",
                    List.of("格式", "表格", "分点", "逐条", "编号", "列表", "字数", "字以内", "不超过",
                            "结构", "标题", "段落", "模板", "json", "markdown", "排版", "层级"),
                    List.of("形式", "样子")),
            new ElementMeta("constraint", "约束条件",
                    List.of("避免", "不要", "禁止", "不能", "不可", "必须", "限制", "严禁", "不允许",
                            "防止", "严谨", "简洁", "正式", "避免使用"),
                    List.of("注意", "切记", "请勿")));

    /** 单个要素的得分 */
    public record ElementScore(String key, String label, double coverage, double detail, double score) {
    }

    /** 一次评分的完整结果 */
    public record ScoreResult(List<ElementScore> elements,
                              /** 五要素合计，0-100 */
                              double completeness,
                              /** 轮数效率，0-100 */
                              double efficiency,
                              /** 综合评分 = 完整度*0.7 + 效率*0.3 */
                              int total,
                              /** 已补全的要素数 0-5 */
                              int filledCount) {
    }

    /**
     * 对一次对话评分。
     *
     * @param originalPrompt 用户最初提的需求
     * @param messages       全部消息（按时间正序）
     * @param currentRound   实际消耗轮数
     * @param maxRounds      轮次上限
     */
    public ScoreResult evaluate(String originalPrompt, List<Message> messages,
                                int currentRound, int maxRounds) {
        double[] coverage = new double[ELEMENTS.size()];
        double[] detail = new double[ELEMENTS.size()];

        // 基线：原始提示词里已经写明的要素
        for (int i = 0; i < ELEMENTS.size(); i++) {
            double cov = coverageIn(originalPrompt, ELEMENTS.get(i));
            coverage[i] = cov;
            // 基线要素**同样要记「具体度」**：只记覆盖度的话每个要素封顶 10/20 分，
            // 结果是「用户一上来就把五要素写全」反而只得约 50 分，而被追问着补齐的人更高分 ——
            // 与「教人一次把提示词写好」的产品目标正好相反。
            if (cov > 0) {
                detail[i] = detailOf(originalPrompt);
            }
        }

        // 最近一次 AI 追问点名要补的要素
        Integer pending = null;
        for (Message msg : messages) {
            if ("assistant".equals(msg.getRole())) {
                // 追问消息记录引导目标；summary / 最终结果消息忽略
                if ("question".equals(msg.getMessageType())) {
                    pending = bestMatch(msg.getContent(), null);
                }
                continue;
            }

            String content = msg.getContent() == null ? "" : msg.getContent();

            // 顺带命中：用户这句话里如果写了别的要素，也一并算上
            for (int i = 0; i < ELEMENTS.size(); i++) {
                double hit = coverageIn(content, ELEMENTS.get(i));
                if (hit > coverage[i]) {
                    coverage[i] = hit;
                }
            }

            // 归属：优先算作回答了最近的追问；若该要素其实已被顺带命中，
            // 则改按本句命中最强的要素归属
            Integer target = pending;
            if (pending != null && coverage[pending] > 0) {
                Integer strongest = bestMatch(content, null);
                target = strongest != null ? strongest : pending;
            }
            if (target == null) {
                target = bestMatch(content, null);
            }
            if (target != null) {
                coverage[target] = Math.max(coverage[target], 1.0);
                detail[target] = Math.max(detail[target], detailOf(content));
            }
            pending = null; // 本轮已作答
        }

        List<ElementScore> elements = new ArrayList<>();
        double completeness = 0;
        int filledCount = 0;
        for (int i = 0; i < ELEMENTS.size(); i++) {
            ElementMeta meta = ELEMENTS.get(i);
            double cov = coverage[i];
            double det = cov > 0 ? detail[i] : 0;
            double score = round1(cov * (10 + 10 * det));
            elements.add(new ElementScore(meta.key(), meta.label(), cov, det, score));
            completeness += score;
            if (cov > 0) {
                filledCount++;
            }
        }

        double efficiency = efficiency(currentRound, maxRounds);
        int total = (int) Math.round(completeness * COMPLETENESS_WEIGHT + efficiency * ROUNDS_WEIGHT);

        return new ScoreResult(elements, round1(completeness), round1(efficiency),
                Math.min(100, Math.max(0, total)), filledCount);
    }

    /**
     * 轮数效率：用满全部轮次 → 60，一轮就完成 → 100。
     *
     * 刻意给下限 60 而不是 0：AI 最多会追问 5 轮，走完全程是**正常路径**，
     * 若按「越少越好」线性给分，正常用户会被系统性压低分数、难以达到掌握阈值。
     */
    private double efficiency(int used, int maxRounds) {
        if (maxRounds <= 1) {
            return 100.0;
        }
        int clamped = Math.max(1, Math.min(used, maxRounds));
        int saved = maxRounds - clamped;
        return EFFICIENCY_FLOOR + saved * (100.0 - EFFICIENCY_FLOOR) / (maxRounds - 1);
    }

    /** 文本是否命中某要素：强命中 1，弱命中 0.5，未命中 0 */
    private double coverageIn(String text, ElementMeta el) {
        if (text == null || text.isEmpty()) {
            return 0;
        }
        String t = text.toLowerCase();
        if (hits(t, el.strong())) {
            return 1.0;
        }
        if (hits(t, el.weak())) {
            return 0.5;
        }
        return 0;
    }

    private boolean hits(String lowerText, List<String> words) {
        for (String w : words) {
            if (lowerText.contains(w.toLowerCase())) {
                return true;
            }
        }
        return false;
    }

    /** 一段回答的「具体度」：长度为主，分点/数字略有加成 */
    private double detailOf(String text) {
        if (text == null) {
            return 0;
        }
        String trimmed = text.trim();
        double base = clamp01(trimmed.length() / 40.0);
        boolean structured = trimmed.matches(".*[，。；、\\n].*") || trimmed.matches(".*\\d.*");
        return clamp01(base * 0.88 + (structured ? 0.12 : 0));
    }

    /** 挑出文本里命中最强的要素（强词命中数量最多者） */
    private Integer bestMatch(String text, List<Integer> ignore) {
        if (text == null || text.isEmpty()) {
            return null;
        }
        String t = text.toLowerCase();
        Integer best = null;
        int bestN = 0;
        for (int i = 0; i < ELEMENTS.size(); i++) {
            if (ignore != null && ignore.contains(i)) {
                continue;
            }
            ElementMeta el = ELEMENTS.get(i);
            int n = 0;
            for (String w : el.strong()) {
                if (t.contains(w.toLowerCase())) {
                    n++;
                }
            }
            if (n > bestN) {
                bestN = n;
                best = i;
            }
        }
        return bestN > 0 ? best : null;
    }

    /** 供其它地方复用要素名（如雷达维度） */
    public List<String> elementKeys() {
        return ELEMENTS.stream().map(ElementMeta::key).toList();
    }

    public List<String> elementLabels() {
        return ELEMENTS.stream().map(ElementMeta::label).toList();
    }

    private static double clamp01(double n) {
        return Math.max(0, Math.min(1, n));
    }

    private static double round1(double n) {
        return Math.round(n * 10) / 10.0;
    }
}
