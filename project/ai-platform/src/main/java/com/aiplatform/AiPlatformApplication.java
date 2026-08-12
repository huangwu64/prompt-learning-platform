package com.aiplatform;

import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

/**
 * 零基础学AI平台 - 后端启动类
 * 功能分块架构：common/（横切）+ config/（框架）+ ai/（AI网关）+ modules/（业务功能块）
 */
@SpringBootApplication
@EnableAspectJAutoProxy
@MapperScan(basePackages = "com.aiplatform.modules", annotationClass = Mapper.class)
public class AiPlatformApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiPlatformApplication.class, args);
    }
}
