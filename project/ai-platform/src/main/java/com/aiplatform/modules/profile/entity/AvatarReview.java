package com.aiplatform.modules.profile.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 头像审核记录。
 *
 * 每次用户提交都是一条新行（不覆盖），保留完整留痕：谁提交、谁审的、
 * 什么时候、通过还是驳回、理由是什么。
 */
@Data
@TableName("avatar_reviews")
@IdPrefix("av")
public class AvatarReview {

    /** 待审核 */
    public static final String STATUS_PENDING = "pending";
    /** 审核通过 */
    public static final String STATUS_APPROVED = "approved";
    /** 审核驳回 */
    public static final String STATUS_REJECTED = "rejected";

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    /** 本次提交的文件路径 */
    private String avatarUrl;

    private String status;

    /** 驳回理由（驳回时必填） */
    private String rejectReason;

    /** 审核管理员 ID */
    private String reviewerId;

    private LocalDateTime reviewedAt;

    private LocalDateTime createdAt;
}
