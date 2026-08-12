package com.aiplatform.common.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标注实体主键前缀，配合自定义主键生成器生成带业务前缀的 ID。
 * 例：@IdPrefix("conv") → conv_xxxxxxxxxxxx
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface IdPrefix {
    String value();
}
