package com.aiplatform.modules.chat.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 苏格拉底对话
 */
@Data
@TableName("conversations")
@IdPrefix("conv")
public class Conversation {

    /** 苏格拉底对话（learning 场景，有 originalPrompt/rating/maxRounds） */
    public static final String TYPE_SOCRATIC = "socratic";

    /** 全局 AI 助手会话（无 originalPrompt/rating，长驻 active） */
    public static final String TYPE_ASSISTANT = "assistant";

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    /**
     * socratic / assistant。
     * 所有按 userId 的查询**必须**带上类型过滤，否则助手的长驻 active 会话会
     * 阻塞用户创建苏格拉底对话并污染其历史列表。
     */
    private String conversationType;

    /** 关联知识点 ID（从学习地图跳转时携带） */
    private String topicId;

    /** 会话标题（助手自动生成，苏格拉底不用） */
    private String title;

    private String originalPrompt;

    private String improvedPrompt;

    /** 改进分析（JSON 字符串，存 JSON 列） */
    private String comparisonResult;

    /** 用户满意度星级 1-5（仅体验反馈，**不影响**学习进度与能力雷达） */
    private Integer rating;

    /** 系统综合评分 0-100 = 完整度 70% + 轮数效率 30%，完成对话时由 PromptScorer 算出 */
    private Integer score;

    /** 五要素分数（JSON 字符串，存 JSON 列），供能力雷达聚合 */
    private String elementScores;

    /** active / completed */
    private String status;

    private Integer currentRound;

    private Integer maxRounds;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
