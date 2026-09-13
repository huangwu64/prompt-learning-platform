package com.aiplatform.config;

import com.aiplatform.common.BizException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
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
        String key = buildKey(rateLimit, joinPoint);
        Long count = redisTemplate.opsForValue().increment(key);
        if (count != null && count == 1) {
            redisTemplate.expire(key, Duration.ofSeconds(rateLimit.windowSeconds()));
        }
        if (count != null && count > rateLimit.limit()) {
            throw new BizException(429, "请求过于频繁，请稍后再试");
        }
        return joinPoint.proceed();
    }

    /**
     * 限流 key：`rl:{type}:{身份}:{接口}`。
     *
     * **接口维度不可省略** —— 否则所有同 type 的端点共用一个计数器，而各自
     * 的阈值又取自本方法的注解，会互相串台：例如用户传了几次头像（5/分）
     * 之后，改密码（同样是 5/分）就会被误判超限。窗口时长同理，会由最先
     * 创建 key 的那个注解决定。
     */
    private String buildKey(RateLimit rateLimit, ProceedingJoinPoint joinPoint) {
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
        return "rl:" + rateLimit.type() + ":" + suffix + ":" + endpointOf(joinPoint);
    }

    /** 形如 ProfileController.uploadAvatar，用于把计数隔离到具体接口 */
    private String endpointOf(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        return signature.getDeclaringType().getSimpleName() + "." + signature.getName();
    }
}
