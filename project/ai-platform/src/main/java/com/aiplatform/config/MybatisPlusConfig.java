package com.aiplatform.config;

import com.aiplatform.common.annotation.IdPrefix;
import com.aiplatform.common.util.IdGenerator;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.core.incrementer.IdentifierGenerator;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.baomidou.mybatisplus.annotation.DbType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * MyBatis-Plus 配置：分页插件 + 自定义主键生成器（带业务前缀的字符串 ID）
 */
@Configuration
public class MybatisPlusConfig {

    @Bean
    public MybatisPlusInterceptor mybatisPlusInterceptor() {
        MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
        interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
        return interceptor;
    }

    /**
     * 依据实体 @IdPrefix 注解生成 `{prefix}_{uuid片段}` 主键。
     * 实体 id 字段使用 @TableId(type = IdType.ASSIGN_UUID) 即可自动触发。
     */
    @Component
    public static class CustomIdGenerator implements IdentifierGenerator {
        @Override
        public Number nextId(Object entity) {
            throw new UnsupportedOperationException("本项目统一使用字符串主键");
        }

        @Override
        public String nextUUID(Object entity) {
            IdPrefix prefix = entity.getClass().getAnnotation(IdPrefix.class);
            return IdGenerator.generate(prefix != null ? prefix.value() : "id");
        }
    }
}
