package com.aiplatform.config;

import com.aiplatform.common.storage.LocalFileStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 静态资源映射：把头像上传目录暴露为 /uploads/avatars/**。
 *
 * 该路径在 SecurityConfig 中对 GET 放开（作品分享页、宣传页要能显示头像），
 * 但只放行这一个子路径，不暴露整个上传根目录。
 */
@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private static final long ONE_DAY_SECONDS = 86_400L;

    private final LocalFileStorage storage;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 手动补尾斜杠：Path.toUri() 在目录尚不存在时不会补，
        // 而 Spring 的资源映射缺了尾斜杠会解析错误
        String location = storage.getAvatarDir().toAbsolutePath().toUri().toString();
        if (!location.endsWith("/")) {
            location = location + "/";
        }
        registry.addResourceHandler("/uploads/avatars/**")
                .addResourceLocations(location)
                .setCachePeriod((int) ONE_DAY_SECONDS);
    }
}
