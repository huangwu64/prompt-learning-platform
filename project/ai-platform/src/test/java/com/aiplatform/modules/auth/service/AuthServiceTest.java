package com.aiplatform.modules.auth.service;

import com.aiplatform.common.BizException;
import com.aiplatform.common.util.JwtUtil;
import com.aiplatform.modules.auth.dto.LoginReq;
import com.aiplatform.modules.auth.dto.RegisterReq;
import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.auth.mapper.UserMapper;
import com.aiplatform.modules.auth.vo.LoginVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 认证服务单元测试
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserMapper userMapper;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private RedisTemplate<String, Object> redisTemplate;
    @Mock
    private ValueOperations<String, Object> valueOperations;
    @InjectMocks
    private AuthService authService;

    private RegisterReq registerReq() {
        RegisterReq req = new RegisterReq();
        req.setEmail("test@example.com");
        req.setUsername("测试用户");
        req.setPassword("123456");
        return req;
    }

    @Test
    void register_success() {
        when(userMapper.selectCount(any())).thenReturn(0L);
        when(passwordEncoder.encode(any())).thenReturn("hash");
        when(jwtUtil.generate(any())).thenReturn("token");

        LoginVO vo = authService.register(registerReq());

        assertEquals("token", vo.getToken());
        assertNotNull(vo.getUser());
        verify(userMapper).insert(any(User.class));
    }

    @Test
    void register_emailExists_throws400() {
        when(userMapper.selectCount(any())).thenReturn(1L);

        BizException ex = assertThrows(BizException.class, () -> authService.register(registerReq()));

        assertEquals(400, ex.getStatus());
    }

    @Test
    void login_success() {
        User user = new User();
        user.setId("user_1");
        user.setPasswordHash("hash");
        when(userMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches(any(), any())).thenReturn(true);
        when(jwtUtil.generate(any())).thenReturn("token");
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        LoginReq req = new LoginReq();
        req.setEmail("test@example.com");
        req.setPassword("123456");
        LoginVO vo = authService.login(req, "127.0.0.1");

        assertEquals("token", vo.getToken());
    }

    @Test
    void login_wrongPassword_throws400() {
        when(userMapper.selectOne(any())).thenReturn(new User());
        when(passwordEncoder.matches(any(), any())).thenReturn(false);
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        LoginReq req = new LoginReq();
        req.setEmail("test@example.com");
        req.setPassword("wrong");
        BizException ex = assertThrows(BizException.class, () -> authService.login(req, "127.0.0.1"));

        assertEquals(400, ex.getStatus());
    }

    @Test
    void login_locked_throws429() {
        when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        when(valueOperations.get(anyString())).thenReturn(5L);

        LoginReq req = new LoginReq();
        req.setEmail("test@example.com");
        req.setPassword("123456");
        BizException ex = assertThrows(BizException.class, () -> authService.login(req, "127.0.0.1"));

        assertEquals(429, ex.getStatus());
    }
}
