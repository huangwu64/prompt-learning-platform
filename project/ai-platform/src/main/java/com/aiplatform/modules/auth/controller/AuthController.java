package com.aiplatform.modules.auth.controller;

import com.aiplatform.common.Result;
import com.aiplatform.config.RateLimit;
import com.aiplatform.modules.auth.dto.LoginReq;
import com.aiplatform.modules.auth.dto.RegisterReq;
import com.aiplatform.modules.auth.service.AuthService;
import com.aiplatform.modules.auth.vo.LoginVO;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 认证接口：注册 / 登录
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public Result<LoginVO> register(@Valid @RequestBody RegisterReq req) {
        return Result.ok(authService.register(req));
    }

    @PostMapping("/login")
    @RateLimit(type = "ip", limit = 20, windowSeconds = 60)
    public Result<LoginVO> login(@Valid @RequestBody LoginReq req, HttpServletRequest request) {
        String ip = request.getHeader("X-Real-IP");
        if (ip == null || ip.isBlank()) {
            ip = request.getRemoteAddr();
        }
        return Result.ok(authService.login(req, ip));
    }
}
