package com.aiplatform.common.util;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 当前登录用户工具
 */
public final class SecurityUtil {

    private SecurityUtil() {
    }

    /** 返回当前登录用户 ID（JWT subject）；未登录返回 null */
    public static String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        return auth.getName();
    }
}
