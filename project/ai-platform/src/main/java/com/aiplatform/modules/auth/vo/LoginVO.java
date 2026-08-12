package com.aiplatform.modules.auth.vo;

import lombok.Data;

/**
 * 登录/注册响应：用户信息 + JWT
 */
@Data
public class LoginVO {

    private UserVO user;
    private String token;
}
