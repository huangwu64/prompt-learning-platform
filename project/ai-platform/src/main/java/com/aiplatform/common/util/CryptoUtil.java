package com.aiplatform.common.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * 敏感配置项的对称加密（AES-256-GCM）。
 *
 * 密钥来源：优先 {@code ai.config-secret}，未配置时回落到 {@code jwt.secret} 派生并**告警** ——
 * 后者不理想（JWT 密钥轮换会导致已存密文无法解密），但比"明文存 apiKey"是净改进。
 *
 * 存储格式：{@code base64(iv):base64(cipher)}，IV 每次随机，因此同一明文两次加密结果不同。
 *
 * ⚠️ 局限要说清楚：它只保护**数据库 dump**。能同时拿到数据库和配置密钥的人仍可解密。
 */
@Slf4j
@Component
public class CryptoUtil {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_BYTES = 12;      // GCM 推荐 96 bit
    private static final int TAG_BITS = 128;
    private static final String SEPARATOR = ":";

    private final SecretKey key;

    public CryptoUtil(@Value("${ai.config-secret:}") String configSecret,
                      @Value("${jwt.secret}") String jwtSecret) {
        String material = (configSecret != null && !configSecret.isBlank()) ? configSecret : jwtSecret;
        if (configSecret == null || configSecret.isBlank()) {
            log.warn("未配置 ai.config-secret，敏感配置的加密密钥改由 jwt.secret 派生。"
                    + "生产环境建议单独配置，否则轮换 JWT 密钥会导致已存密文无法解密");
        }
        this.key = deriveKey(material);
    }

    /** 加密。空输入返回 null（表示「沿用环境变量」） */
    public String encrypt(String plain) {
        if (plain == null || plain.isEmpty()) {
            return null;
        }
        try {
            byte[] iv = new byte[IV_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));

            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            Base64.Encoder encoder = Base64.getEncoder();
            return encoder.encodeToString(iv) + SEPARATOR + encoder.encodeToString(encrypted);
        } catch (Exception e) {
            throw new IllegalStateException("配置加密失败: " + e.getMessage(), e);
        }
    }

    /**
     * 解密。**任何失败都返回 null 而不是抛异常** —— 密文损坏或密钥变更时，
     * 调用方应回落到环境变量里的 key 继续工作，而不是让整个服务起不来。
     */
    public String decrypt(String cipherText) {
        if (cipherText == null || cipherText.isBlank()) {
            return null;
        }
        int idx = cipherText.indexOf(SEPARATOR);
        if (idx <= 0) {
            log.warn("待解密的配置格式不正确，忽略");
            return null;
        }
        try {
            Base64.Decoder decoder = Base64.getDecoder();
            byte[] iv = decoder.decode(cipherText.substring(0, idx));
            byte[] encrypted = decoder.decode(cipherText.substring(idx + 1));

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.warn("配置解密失败（密钥是否变更过？），将回落到环境变量: {}", e.getMessage());
            return null;
        }
    }

    /** 脱敏展示：保留前 3 位与后 4 位，中间打码 */
    public static String mask(String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        if (secret.length() < 8) {
            return "****";
        }
        return secret.substring(0, 3) + "****" + secret.substring(secret.length() - 4);
    }

    /** SHA-256 派生固定长度的 AES 密钥 */
    private SecretKey deriveKey(String material) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(material.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(digest, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("无法派生加密密钥", e);
        }
    }
}
