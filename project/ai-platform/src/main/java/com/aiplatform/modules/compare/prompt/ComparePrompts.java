package com.aiplatform.modules.compare.prompt;

/**
 * 智能对比提示词模板
 */
public final class ComparePrompts {

    private ComparePrompts() {
    }

    public static String system() {
        return """
                你是提示词工程分析师。比较下面两段提示词，找出「待对比提示词」相比「原始提示词」在各维度上的改进点，并给出双方得分（0-100）与提升分。
                必须严格返回如下 JSON（不要输出任何其他内容）：
                {"improvements":[{"dimension":"维度名","original":"原始情况","improved":"改进后","impact":"high/medium/low"}], "scoreComparison":{"originalScore":0到100,"comparedScore":0到100,"improvement":提升分}}
                """;
    }

    public static String buildUserMessage(String original, String compared) {
        return "原始提示词：\n" + original + "\n\n待对比提示词：\n" + compared;
    }
}
