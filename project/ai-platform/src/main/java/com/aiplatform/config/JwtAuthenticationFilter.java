package com.aiplatform.config;

import com.aiplatform.common.filter.TraceIdFilter;
import com.aiplatform.common.util.JwtUtil;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * JWT 认证过滤器：解析 Authorization 头，校验通过则写入 SecurityContext
 * （principal = userId，authorities = ROLE_{role}）。
 * 无效 token 不拦截，由 Security 对受保护路径统一返回 401。
 *
 * 角色与禁用状态优先读 Redis 标记位，使管理员的改角色/禁用操作**秒级生效**，
 * 不必等旧 token 的 7 天有效期走完。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** 禁用标记位：值无关，存在即禁用。写入方 AdminUserService */
    public static final String KEY_DISABLED = "user:disabled:";

    /** 角色标记位：值为 USER / ADMIN。写入方 AdminUserService */
    public static final String KEY_ROLE = "user:role:";

    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                JwtUtil.JwtPayload payload = jwtUtil.parsePayload(header.substring(7));
                String userId = payload.userId();

                if (isDisabled(userId)) {
                    SecurityContextHolder.clearContext();
                    filterChain.doFilter(request, response);
                    return;
                }

                var authentication = new UsernamePasswordAuthenticationToken(
                        userId, null, authoritiesOf(effectiveRole(userId, payload.role())));
                SecurityContextHolder.getContext().setAuthentication(authentication);

                // 供 RequestLogFilter 落库用：它跑在 Security 链之外，
                // 那时 SecurityContextHolder 已被清空，直接取 SecurityUtil 恒为 null
                MDC.put(TraceIdFilter.MDC_USER_ID, userId);
            } catch (JwtException | IllegalArgumentException e) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    /**
     * 禁用标记位查询。
     * Redis 故障时 **fail-open**（按未禁用处理）：可用性优先于一致性，
     * 且 AuthService.login 会查库校验 status，是第二道闸。
     */
    private boolean isDisabled(String userId) {
        try {
            return Boolean.TRUE.equals(redisTemplate.hasKey(KEY_DISABLED + userId));
        } catch (Exception e) {
            log.warn("读取禁用标记位失败，按未禁用处理 userId={}: {}", userId, e.getMessage());
            return false;
        }
    }

    /** 角色优先取标记位（管理员改角色后秒级生效），回落 token 内的 claim */
    private String effectiveRole(String userId, String claimRole) {
        try {
            Object override = redisTemplate.opsForValue().get(KEY_ROLE + userId);
            if (override != null) {
                String role = String.valueOf(override);
                if (!role.isBlank()) {
                    return role;
                }
            }
        } catch (Exception e) {
            log.warn("读取角色标记位失败，回落 token claim userId={}: {}", userId, e.getMessage());
        }
        return claimRole;
    }

    /** 改造上线前签发的旧 token 没有 role claim，此时给空权限集（等同普通用户） */
    private List<SimpleGrantedAuthority> authoritiesOf(String role) {
        if (role == null || role.isBlank()) {
            return List.of();
        }
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
}
