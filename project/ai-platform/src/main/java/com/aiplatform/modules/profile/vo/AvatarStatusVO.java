package com.aiplatform.modules.profile.vo;

import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.profile.entity.AvatarReview;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 头像状态（用户端展示用）。
 *
 * 注意 avatar 与 pendingAvatar 是两个槽位：pending 期间 avatar 仍是旧值，
 * 前端不该提前把待审图显示成「当前头像」。
 */
@Data
public class AvatarStatusVO {

    /** none / pending / approved / rejected */
    private String status;
    /** 当前生效的头像 */
    private String avatar;
    /** 待审头像（仅 pending 时有值） */
    private String pendingAvatar;
    /** 驳回理由（仅 rejected 时有值） */
    private String rejectReason;
    /** 本次提交时间 */
    private LocalDateTime submittedAt;

    public static AvatarStatusVO of(User user, AvatarReview latestReview) {
        AvatarStatusVO vo = new AvatarStatusVO();
        vo.setStatus(user.getAvatarStatus() == null ? "none" : user.getAvatarStatus());
        vo.setAvatar(user.getAvatar());
        vo.setPendingAvatar(user.getAvatarPendingUrl());
        vo.setRejectReason(user.getAvatarRejectReason());
        if (latestReview != null) {
            vo.setSubmittedAt(latestReview.getCreatedAt());
        }
        return vo;
    }
}
