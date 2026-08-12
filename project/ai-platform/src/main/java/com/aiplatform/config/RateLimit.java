package com.aiplatform.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Redis 分布式限流注解，作用于 Controller 方法。
 * type：ip（按来源 IP）/ user（按当前用户）/ lab（实验室实验，按用户）
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {

    String type() default "ip";

    int limit();

    int windowSeconds() default 60;
}
