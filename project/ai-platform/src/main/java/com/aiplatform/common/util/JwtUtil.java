package com.aiplatform.common.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 工具：签发与解析，subject 为用户 ID，claim 携带角色
 */
@Component
public class JwtUtil {

    /** JWT 载荷：用户 ID + 角色 */
    public record JwtPayload(String userId, String role) {
    }

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expire-hours}")
    private long expireHours;

    private SecretKey key() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** 签发 token，有效期默认 7 天 */
    public String generate(String userId, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId)
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expireHours * 3600_000L))
                .signWith(key())
                .compact();
    }

    /**
     * 解析 token，返回用户 ID + 角色。
     * 无效/过期抛出 JwtException，由调用方转 401。
     *
     * 注意：role 可能为 null —— 改造上线前签发的旧 token 没有该 claim。
     * 调用方需按"无角色"降级处理，不要抛异常。
     */
    public JwtPayload parsePayload(String token) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(key())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return new JwtPayload(claims.getSubject(), claims.get("role", String.class));
    }

    /** 仅取用户 ID（保留给不需要角色的调用方） */
    public String parse(String token) throws JwtException {
        return parsePayload(token).userId();
    }
}
