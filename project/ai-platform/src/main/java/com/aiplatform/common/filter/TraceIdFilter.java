package com.aiplatform.common.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * 请求追踪与安全响应头：
 * - 生成 traceId 写入 MDC（日志全链路关联）并通过响应头 X-Trace-Id 返回，便于定位问题
 * - 附加基础安全响应头（nosniff / 防点击劫持 / XSS）
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

    static final String TRACE_ID = "traceId";

    /**
     * 当前登录用户 ID 的 MDC key。
     * 由 JwtAuthenticationFilter 写入（那时 SecurityContext 才刚建立），
     * 供 RequestLogFilter 在 finally 中落库使用 —— 后者在 Security 链之外，
     * 那时 SecurityContextHolder 已被清空，直接取 SecurityUtil 恒为 null。
     */
    public static final String MDC_USER_ID = "userId";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        MDC.put(TRACE_ID, traceId);
        response.setHeader("X-Trace-Id", traceId);
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("X-XSS-Protection", "1; mode=block");
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(TRACE_ID);
            // 本过滤器是最外层，由它统一清理 userId，避免 Tomcat 复用线程时串号
            MDC.remove(MDC_USER_ID);
        }
    }
}
