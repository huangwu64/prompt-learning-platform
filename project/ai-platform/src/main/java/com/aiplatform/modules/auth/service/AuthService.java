package com.aiplatform.modules.auth.service;

import com.aiplatform.common.BizException;
import com.aiplatform.common.util.JwtUtil;
import com.aiplatform.modules.auth.dto.LoginReq;
import com.aiplatform.modules.auth.dto.RegisterReq;
import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.auth.mapper.UserMapper;
import com.aiplatform.modules.auth.vo.LoginVO;
import com.aiplatform.modules.auth.vo.UserVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * 认证业务：注册、登录、JWT 签发、失败锁定
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILURES = 5;
    private static final long LOCK_MINUTES = 15;

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final RedisTemplate<String, Object> redisTemplate;

    public LoginVO register(RegisterReq req) {
        Long emailCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getEmail, req.getEmail()));
        if (emailCount > 0) {
            throw new BizException(400, "该邮箱已注册");
        }
        Long usernameCount = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, req.getUsername()));
        if (usernameCount > 0) {
            throw new BizException(400, "该用户名已被使用");
        }

        User user = new User();
        user.setEmail(req.getEmail());
        user.setUsername(req.getUsername());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole("USER");
        user.setStatus("active");
        user.setStreakDays(0);
        userMapper.insert(user);
        log.info("用户注册成功 userId={} email={}", user.getId(), user.getEmail());
        return buildLoginVO(user);
    }

    public LoginVO login(LoginReq req, String ip) {
        String lockKey = "rl:login:" + req.getEmail() + ":" + ip;
        Object locked = redisTemplate.opsForValue().get(lockKey);
        if (locked != null && ((Number) locked).longValue() >= MAX_FAILURES) {
            throw new BizException(429, "登录失败次数过多，请 15 分钟后再试");
        }

        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getEmail, req.getEmail()));
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            Long failures = redisTemplate.opsForValue().increment(lockKey);
            if (failures != null && failures == 1) {
                redisTemplate.expire(lockKey, Duration.ofMinutes(LOCK_MINUTES));
            }
            throw new BizException(400, "邮箱或密码错误");
        }

        // 密码正确后再校验账号状态。放在密码校验之后，避免把"账号存在且密码正确"
        // 这一信息泄露给仅猜中密码的一方之外的人；同时也不计入失败次数。
        if ("disabled".equals(user.getStatus())) {
            throw new BizException(403, "账号已被禁用，请联系管理员");
        }
        if ("deleted".equals(user.getStatus())) {
            // 软删账号不暴露真实原因，与密码错误同口径
            throw new BizException(400, "邮箱或密码错误");
        }

        redisTemplate.delete(lockKey);
        user.setLastLoginAt(LocalDateTime.now());
        userMapper.updateById(user);
        log.info("用户登录成功 userId={}", user.getId());
        return buildLoginVO(user);
    }

    private LoginVO buildLoginVO(User user) {
        LoginVO vo = new LoginVO();
        vo.setUser(UserVO.from(user));
        // 带上 role claim，前端据此决定是否显示管理后台入口
        vo.setToken(jwtUtil.generate(user.getId(), user.getRole()));
        return vo;
    }
}
