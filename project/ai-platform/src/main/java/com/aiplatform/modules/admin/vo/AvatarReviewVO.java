package com.aiplatform.modules.admin.vo;

import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.profile.entity.AvatarReview;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 头像审核项（后台展示用）。
 *
 * 同时给出「本次提交的图」与「用户当前生效的图」——
 * 审核员需要能对比，也要能看出驳回后用户不会丢头像。
 */
@Data
public class AvatarReviewVO {

    private String reviewId;
    private String userId;
    private String username;
    private String email;

    /** 本次提交的头像 */
    private String avatarUrl;
    /** 该用户当前生效的头像（可能为 null） */
    private String currentAvatar;

    private String status;
    private String rejectReason;

    private String reviewerId;
    private String reviewerName;

    private LocalDateTime submittedAt;
    private LocalDateTime reviewedAt;

    public static AvatarReviewVO of(AvatarReview review, User owner, User reviewer) {
        AvatarReviewVO vo = new AvatarReviewVO();
        vo.setReviewId(review.getId());
        vo.setUserId(review.getUserId());
        vo.setAvatarUrl(review.getAvatarUrl());
        vo.setStatus(review.getStatus());
        vo.setRejectReason(review.getRejectReason());
        vo.setReviewerId(review.getReviewerId());
        vo.setSubmittedAt(review.getCreatedAt());
        vo.setReviewedAt(review.getReviewedAt());
        if (owner != null) {
            vo.setUsername(owner.getUsername());
            vo.setEmail(owner.getEmail());
            vo.setCurrentAvatar(owner.getAvatar());
        }
        if (reviewer != null) {
            vo.setReviewerName(reviewer.getUsername());
        }
        return vo;
    }
}
