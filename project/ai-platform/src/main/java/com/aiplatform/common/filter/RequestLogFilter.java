package com.aiplatform.common.filter;

import com.aiplatform.modules.admin.service.SystemLogRecorder;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 请求日志过滤器：控制台记全部，数据库只记**错误与慢请求**。
 *
 * 全量入库会把库写成热点，所以设了两道门槛：status >= 400 或耗时 >= 1000ms。
 *
 * 关于 userId：本过滤器跑在 Spring Security 链**之外**，finally 执行时
 * SecurityContextHolder 已被清空 —— 直接取 SecurityUtil 恒为 null。
 * 因此改从 MDC 读，由 JwtAuthenticationFilter 写入。
 */
@Slf4j
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
@RequiredArgsConstructor
public class RequestLogFilter extends OncePerRequestFilter {

    private static final int SLOW_THRESHOLD_MS = 1000;

    private final SystemLogRecorder logRecorder;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long cost = System.currentTimeMillis() - start;
            String traceId = MDC.get(TraceIdFilter.TRACE_ID);
            int status = response.getStatus();

            log.info("请求 method={} path={} status={} cost={}ms traceId={}",
                    request.getMethod(), request.getRequestURI(), status, cost, traceId);

            if (status >= 400 || cost >= SLOW_THRESHOLD_MS) {
                logRecorder.record(
                        traceId,
                        levelOf(status),
                        request.getMethod(),
                        request.getRequestURI(),
                        status,
                        MDC.get(TraceIdFilter.MDC_USER_ID),
                        clientIp(request),
                        (int) cost,
                        null);
            }
        }
    }

    /** 级别反映最严重的那一面：5xx 是故障，4xx 是客户端问题，其余慢请求单独标 SLOW */
    private String levelOf(int status) {
        if (status >= 500) {
            return "ERROR";
        }
        if (status >= 400) {
            return "WARN";
        }
        return "SLOW";
    }

    /** 与 RateLimitAspect 保持一致的取法：优先取反代写入的 X-Real-IP */
    private String clientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Real-IP");
        return (ip != null && !ip.isBlank()) ? ip : request.getRemoteAddr();
    }
}
