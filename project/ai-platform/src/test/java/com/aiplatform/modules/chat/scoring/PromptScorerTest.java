package com.aiplatform.modules.chat.scoring;

import com.aiplatform.modules.chat.entity.Message;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 五要素评分器单元测试。
 *
 * 这个算法是掌握度与能力雷达的**唯一依据**，所以口径要锁住：
 * 「一上来就把提示词写好」不该比「被追问着补齐」得分低。
 */
class PromptScorerTest {

    private final PromptScorer scorer = new PromptScorer();

    private Message msg(String role, String type, String content) {
        Message m = new Message();
        m.setRole(role);
        m.setMessageType(type);
        m.setContent(content);
        return m;
    }

    @Test
    void 五要素补齐时能拿到掌握级分数() {
        String original = "你是一位资深HR，帮我写一封给上级的季度汇报邮件";
        List<Message> messages = List.of(
                msg("assistant", "question", "有什么背景需要补充？"),
                msg("user", "answer", "背景是团队刚完成季度目标，面向部门总监"),
                msg("assistant", "question", "期望的输出格式？"),
                msg("user", "answer", "分点列出，不超过500字，用表格呈现"),
                msg("assistant", "question", "有什么约束条件？"),
                msg("user", "answer", "不要使用夸张措辞，必须保持正式"));

        PromptScorer.ScoreResult r = scorer.evaluate(original, messages, 4, 5);

        assertEquals(5, r.filledCount(), "五个要素都应判定为已补全");
        assertTrue(r.completeness() >= 70, "完整度应达掌握级，实际 " + r.completeness());
        assertTrue(r.total() >= 70, "综合评分应能过入门阶段阈值(70)，实际 " + r.total());
    }

    @Test
    void 提示词一次写全不应低于被追问补齐() {
        // 关键口径：用户一上来就把要素写全，是产品希望教出来的行为，不该被算法惩罚
        String completePrompt = "你是一位资深HR，帮我写一份季度汇报，"
                + "背景是团队刚完成目标、面向部门总监，请分点列出不超过500字，"
                + "不要使用夸张措辞、必须保持正式";
        PromptScorer.ScoreResult once = scorer.evaluate(completePrompt, List.of(), 1, 5);

        assertEquals(5, once.filledCount(), "一次写全应覆盖全部五要素");
        assertTrue(once.completeness() >= 70, "一次写全的完整度也不该低，实际 " + once.completeness());
        assertEquals(100.0, once.efficiency(), "1 轮完成效率分应为满分");
    }

    @Test
    void 轮数效率用满轮次得下限而非零() {
        // 走满 5 轮是 AI 追问机制下的正常路径，不该被系统性压到低分
        assertEquals(100.0, scorer.evaluate("帮我写邮件", List.of(), 1, 5).efficiency());
        assertEquals(60.0, scorer.evaluate("帮我写邮件", List.of(), 5, 5).efficiency());
        assertEquals(80.0, scorer.evaluate("帮我写邮件", List.of(), 3, 5).efficiency());
    }

    @Test
    void 综合评分等于完整度与效率的加权() {
        PromptScorer.ScoreResult r = scorer.evaluate(
                "你是一位老师，帮我分析这段文本，背景是教学场景，要分点输出，不要超纲",
                List.of(), 3, 5);

        int expected = (int) Math.round(r.completeness() * 0.7 + r.efficiency() * 0.3);
        assertEquals(Math.min(100, expected), r.total());
    }

    @Test
    void 空提示词不崩且完整度为零() {
        PromptScorer.ScoreResult r = scorer.evaluate("", List.of(), 1, 5);

        assertEquals(0, r.filledCount());
        assertEquals(0.0, r.completeness());
        assertTrue(r.total() >= 0);
        assertEquals(5, r.elements().size(), "无论有无内容都应返回五个维度");
    }
}
