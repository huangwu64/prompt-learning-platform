package com.aiplatform.modules.admin.vo;

import com.aiplatform.modules.auth.entity.User;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户管理列表项（后台）。
 *
 * 不含 passwordHash —— 密码是 BCrypt 哈希，后台只能重置、无法查看，
 * 连哈希也不该往外发。
 */
@Data
public class AdminUserVO {

    /** 用户 ID。主键，只读，不提供修改入口 */
    private String id;

    private String email;
    private String username;
    private String role;
    /** active / disabled / deleted */
    private String status;

    private String avatar;
    private String avatarStatus;

    private Integer streakDays;
    /** 会话数（含苏格拉底与助手） */
    private long conversationCount;
    /** 作品数 */
    private long workCount;

    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;

    public static AdminUserVO of(User u, long conversationCount, long workCount) {
        AdminUserVO vo = new AdminUserVO();
        vo.setId(u.getId());
        vo.setEmail(u.getEmail());
        vo.setUsername(u.getUsername());
        vo.setRole(u.getRole());
        vo.setStatus(u.getStatus());
        vo.setAvatar(u.getAvatar());
        vo.setAvatarStatus(u.getAvatarStatus());
        vo.setStreakDays(u.getStreakDays());
        vo.setConversationCount(conversationCount);
        vo.setWorkCount(workCount);
        vo.setLastLoginAt(u.getLastLoginAt());
        vo.setCreatedAt(u.getCreatedAt());
        return vo;
    }
}
