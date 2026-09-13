package com.aiplatform.common.util;

import com.aiplatform.common.BizException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 当前登录用户工具
 */
public final class SecurityUtil {

    private static final String ROLE_PREFIX = "ROLE_";

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

    /**
     * 返回当前登录用户角色（USER / ADMIN）。
     * 未登录、或改造上线前签发的旧 token（无 role claim）返回 null。
     */
    public static String currentUserRole() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return null;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a != null && a.startsWith(ROLE_PREFIX))
                .map(a -> a.substring(ROLE_PREFIX.length()))
                .findFirst()
                .orElse(null);
    }

    public static boolean isAdmin() {
        return "ADMIN".equals(currentUserRole());
    }

    /**
     * 非管理员抛 403。
     * 路由级已由 SecurityConfig 的 hasRole("ADMIN") 兜底，这里用于 Service 层的防御性校验
     * ——防的是将来新增 Controller 时忘了配路由规则。
     */
    public static void requireAdmin() {
        if (!isAdmin()) {
            throw new BizException(403, "无权访问该资源");
        }
    }
}
