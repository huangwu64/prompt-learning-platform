package com.aiplatform.modules.works.prompt;

import java.util.Map;

/**
 * 作品工厂提示词模板（按 workType 区分策略）
 */
public final class WorkPrompts {

    private WorkPrompts() {
    }

    public static String system(String workType) {
        return switch (workType) {
            case "email" -> "你是专业的商务邮件写作助手。根据用户提供的收件人身份调整称呼和措辞，输出结构完整、语气得体的商务邮件。";
            case "ppt" -> "你是专业的 PPT 大纲策划师。请把用户需求结构化输出为清晰的「章节 — 页面 — 要点」三级大纲，层级分明。";
            case "report" -> "你是专业文案写作者。请围绕用户提供的要点展开论述，控制篇幅，输出结构清晰的报告/文案。";
            case "social" -> "你是社交媒体运营专家。根据用户指定的平台匹配内容调性（如小红书种草风、抖音脚本风），输出适配平台的文案。";
            default -> "你是专业内容创作助手。";
        };
    }

    /** 把表单数据转为自然语言需求描述 */
    public static String buildRequest(Map<String, Object> formData) {
        StringBuilder sb = new StringBuilder("请根据以下需求生成内容：\n");
        formData.forEach((key, value) -> sb.append("- ").append(key).append(": ").append(value).append("\n"));
        sb.append("请直接输出内容，不要解释。");
        return sb.toString();
    }
}
