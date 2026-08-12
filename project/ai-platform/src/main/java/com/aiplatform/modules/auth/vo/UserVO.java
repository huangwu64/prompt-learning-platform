package com.aiplatform.modules.auth.vo;

import com.aiplatform.modules.auth.entity.User;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 用户信息（对外，不含密码）
 */
@Data
public class UserVO {

    private String id;
    private String email;
    private String username;
    private String avatar;
    private Integer streakDays;
    private LocalDateTime createdAt;

    public static UserVO from(User user) {
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setEmail(user.getEmail());
        vo.setUsername(user.getUsername());
        vo.setAvatar(user.getAvatar());
        vo.setStreakDays(user.getStreakDays());
        vo.setCreatedAt(user.getCreatedAt());
        return vo;
    }
}
