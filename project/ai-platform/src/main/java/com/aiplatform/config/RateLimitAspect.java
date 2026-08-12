package com.aiplatform.config;

import com.aiplatform.common.BizException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Duration;

/**
 * 限流 AOP：Redis INCR + EXPIRE 计数，超出阈值抛 429。
 */
@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final RedisTemplate<String, Object> redisTemplate;

    @Around("@annotation(rateLimit)")
    public Object around(ProceedingJoinPoint joinPoint, RateLimit rateLimit) throws Throwable {
        String key = buildKey(rateLimit);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofSeconds(rateLimit.windowSeconds()));
        }
        if (count != null && count > rateLimit.limit()) {
            throw new BizException(429, "请求过于频繁，请稍后再试");
        }
        return joinPoint.proceed();
    }

    private String buildKey(RateLimit rateLimit) {
        String suffix;
        switch (rateLimit.type()) {
            case "user", "lab" -> {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                suffix = auth != null ? auth.getName() : "anonymous";
            }
            default -> {
                ServletRequestAttributes attrs =
                        (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
                HttpServletRequest request = attrs != null ? attrs.getRequest() : null;
                String ip = request != null ? request.getHeader("X-Real-IP") : null;
                suffix = ip != null ? ip : (request != null ? request.getRemoteAddr() : "unknown");
            }
        }
        return "rl:" + rateLimit.type() + ":" + suffix;
    }
}
