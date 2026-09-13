package com.aiplatform.modules.profile.vo;

import com.aiplatform.modules.auth.entity.User;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 个人资料（对外，不含密码）
 */
@Data
public class ProfileVO {

    private String id;
    private String email;
    private String username;
    private String role;

    /** 当前对外可见的头像（仅审核通过的），可能为 null —— 前端回落默认占位 */
    private String avatar;
    /** none / pending / approved / rejected */
    private String avatarStatus;
    /** 最近一次驳回理由，供用户端展示 */
    private String avatarRejectReason;

    private Integer streakDays;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    public static ProfileVO from(User user) {
        ProfileVO vo = new ProfileVO();
        vo.setId(user.getId());
        vo.setEmail(user.getEmail());
        vo.setUsername(user.getUsername());
        vo.setRole(user.getRole());
        vo.setAvatar(user.getAvatar());
        vo.setAvatarStatus(user.getAvatarStatus());
        vo.setAvatarRejectReason(user.getAvatarRejectReason());
        vo.setStreakDays(user.getStreakDays());
        vo.setLastLoginAt(user.getLastLoginAt());
        vo.setCreatedAt(user.getCreatedAt());
        return vo;
    }
}
