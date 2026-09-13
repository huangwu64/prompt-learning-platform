package com.aiplatform.modules.admin.service;

import com.aiplatform.ai.AiHttpClient;
import com.aiplatform.common.util.CryptoUtil;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.config.AiConfigHolder;
import com.aiplatform.config.AiProperties;
import com.aiplatform.config.AiRuntimeConfig;
import com.aiplatform.modules.admin.dto.UpdateAiConfigReq;
import com.aiplatform.modules.admin.entity.AiProviderConfig;
import com.aiplatform.modules.admin.mapper.AiProviderConfigMapper;
import com.aiplatform.modules.admin.vo.AiConfigTestVO;
import com.aiplatform.modules.admin.vo.AiConfigVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * AI 提供商配置：加密存储 + 热更新 + 试连。
 *
 * 生效链路：数据库 → 解密 → {@link AiConfigHolder#refresh} → 下一个 AI 请求立即用新值。
 * 无需重启，也不依赖任何缓存刷新接口。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiConfigService {

    private static final String PROVIDER = AiProviderConfig.PROVIDER_DEEPSEEK;

    private final AiProviderConfigMapper configMapper;
    private final AiConfigHolder holder;
    private final AiProperties props;
    private final CryptoUtil crypto;
    private final AiHttpClient httpClient;

    @PostConstruct
    public void init() {
        reload();
    }

    /** 启动时载入配置。失败不阻断启动 —— 保持 application.yml 的值继续服务 */
    public void reload() {
        try {
            AiProviderConfig row = requireRow();
            holder.refresh(toRuntime(row));
            log.info("AI 配置已载入 model={} baseUrl={} key来源={}",
                    row.getModel(), row.getBaseUrl(), keySource(row));
        } catch (Exception e) {
            log.warn("AI 配置载入失败，继续使用 application.yml 的值: {}", e.getMessage());
        }
    }

    public AiConfigVO get() {
        AiProviderConfig row = requireRow();
        AiRuntimeConfig cfg = holder.get();

        AiConfigVO vo = new AiConfigVO();
        vo.setProvider(PROVIDER);
        vo.setBaseUrl(row.getBaseUrl());
        vo.setModel(row.getModel());
        vo.setDailyLimit(row.getDailyLimit());
        vo.setAssistantDailyLimit(row.getAssistantDailyLimit());
        vo.setTimeoutSeconds(row.getTimeoutSeconds());
        vo.setStreamTimeoutSeconds(row.getStreamTimeoutSeconds());
        vo.setMaxTokens(row.getMaxTokens());
        vo.setEnabled(row.getEnabled() != null && row.getEnabled() == 1);
        vo.setUpdatedBy(row.getUpdatedBy());
        vo.setUpdatedAt(row.getUpdatedAt());

        String plain = effectiveApiKey(row);
        vo.setApiKeyMasked(CryptoUtil.mask(plain));
        vo.setApiKeyConfigured(plain != null && !plain.isBlank());
        vo.setApiKeySource(keySource(row));
        // 防御：万一运行时配置与库里不一致（例如载入失败回落了），至少让它可见
        if (!cfg.model().equals(row.getModel())) {
            vo.setModel(row.getModel());
        }
        return vo;
    }

    @Transactional
    public AiConfigVO update(UpdateAiConfigReq req) {
        String adminId = SecurityUtil.currentUserId();
        AiProviderConfig row = requireRow();

        LambdaUpdateWrapper<AiProviderConfig> update = new LambdaUpdateWrapper<AiProviderConfig>()
                .eq(AiProviderConfig::getId, row.getId())
                .set(AiProviderConfig::getBaseUrl, req.getBaseUrl().trim())
                .set(AiProviderConfig::getModel, req.getModel().trim())
                .set(AiProviderConfig::getDailyLimit, req.getDailyLimit())
                .set(AiProviderConfig::getAssistantDailyLimit, req.getAssistantDailyLimit())
                .set(AiProviderConfig::getTimeoutSeconds, req.getTimeoutSeconds())
                .set(AiProviderConfig::getStreamTimeoutSeconds, req.getStreamTimeoutSeconds())
                .set(AiProviderConfig::getMaxTokens, req.getMaxTokens())
                .set(AiProviderConfig::getEnabled, Boolean.FALSE.equals(req.getEnabled()) ? 0 : 1)
                .set(AiProviderConfig::getUpdatedBy, adminId);

        // 密钥三态：不传/传脱敏串 = 保持不变；传空串 = 清空（回落环境变量）；传新值 = 加密写入
        String incoming = req.getApiKey();
        if (incoming != null) {
            if (incoming.isBlank()) {
                update.set(AiProviderConfig::getApiKeyCipher, null);
                log.info("管理员清空了库里的 apiKey，将回落到环境变量");
            } else if (!incoming.contains("****")) {
                update.set(AiProviderConfig::getApiKeyCipher, crypto.encrypt(incoming.trim()));
            }
        }
        configMapper.update(null, update);

        AiProviderConfig fresh = configMapper.selectById(row.getId());
        holder.refresh(toRuntime(fresh));
        log.info("AI 配置已更新 by={} model={} dailyLimit={} assistantDailyLimit={}",
                adminId, fresh.getModel(), fresh.getDailyLimit(), fresh.getAssistantDailyLimit());
        return get();
    }

    /** 试连：用请求里的候选值（缺省沿用当前），走 max_tokens=1 把消耗压到最低 */
    public AiConfigTestVO testConnection(UpdateAiConfigReq req) {
        AiProviderConfig row = requireRow();

        AiRuntimeConfig candidate = new AiRuntimeConfig(
                require(req.getBaseUrl(), row.getBaseUrl()),
                resolveKeyForTest(req, row),
                require(req.getModel(), row.getModel()),
                orDefault(req.getTimeoutSeconds(), row.getTimeoutSeconds()),
                orDefault(req.getStreamTimeoutSeconds(), row.getStreamTimeoutSeconds()),
                orDefault(req.getMaxTokens(), row.getMaxTokens()),
                orDefault(req.getDailyLimit(), row.getDailyLimit()),
                orDefault(req.getAssistantDailyLimit(), row.getAssistantDailyLimit()),
                true);

        if (candidate.apiKey() == null || candidate.apiKey().isBlank()) {
            return AiConfigTestVO.failure(0, "尚未配置 apiKey");
        }

        long start = System.currentTimeMillis();
        try {
            String model = httpClient.probe(candidate);
            int cost = (int) (System.currentTimeMillis() - start);
            log.info("AI 配置试连成功 model={} cost={}ms", model, cost);
            return AiConfigTestVO.success(cost, model);
        } catch (Exception e) {
            int cost = (int) (System.currentTimeMillis() - start);
            log.warn("AI 配置试连失败 cost={}ms: {}", cost, e.getMessage());
            return AiConfigTestVO.failure(cost, e.getMessage());
        }
    }

    // ==================== 私有工具 ====================

    /** 库里没有行时用 application.yml 的值播种（首次启动自动完成） */
    private AiProviderConfig requireRow() {
        AiProviderConfig row = configMapper.selectOne(
                new LambdaQueryWrapper<AiProviderConfig>().eq(AiProviderConfig::getProvider, PROVIDER));
        if (row != null) {
            return row;
        }

        AiRuntimeConfig cfg = holder.get();
        AiProviderConfig seed = new AiProviderConfig();
        seed.setProvider(PROVIDER);
        seed.setBaseUrl(cfg.baseUrl());
        seed.setModel(cfg.model());
        // 环境变量没配 key 时 encrypt("") 返回 null —— 库里保持 NULL，运行时回落环境变量
        seed.setApiKeyCipher(crypto.encrypt(cfg.apiKey()));
        seed.setDailyLimit(cfg.dailyLimit());
        seed.setAssistantDailyLimit(cfg.assistantDailyLimit());
        seed.setTimeoutSeconds(cfg.timeoutSeconds());
        seed.setStreamTimeoutSeconds(cfg.streamTimeoutSeconds());
        seed.setMaxTokens(cfg.maxTokens());
        seed.setEnabled(1);
        configMapper.insert(seed);
        log.info("AI 配置表为空，已用 application.yml 的值完成播种（apiKey {})",
                seed.getApiKeyCipher() == null ? "未写入库，运行时读环境变量" : "已加密入库");
        return seed;
    }

    private AiRuntimeConfig toRuntime(AiProviderConfig row) {
        return new AiRuntimeConfig(
                row.getBaseUrl(),
                effectiveApiKey(row),
                row.getModel(),
                orDefault(row.getTimeoutSeconds(), 30),
                orDefault(row.getStreamTimeoutSeconds(), 120),
                orDefault(row.getMaxTokens(), 2048),
                orDefault(row.getDailyLimit(), 50),
                orDefault(row.getAssistantDailyLimit(), 100),
                row.getEnabled() == null || row.getEnabled() == 1);
    }

    /** 库里没有可用密文时回落到环境变量 —— 这样"清空密钥"是一个可用的退路 */
    private String effectiveApiKey(AiProviderConfig row) {
        String decrypted = crypto.decrypt(row.getApiKeyCipher());
        return (decrypted == null || decrypted.isBlank()) ? props.getDeepseek().getApiKey() : decrypted;
    }

    private String keySource(AiProviderConfig row) {
        String decrypted = crypto.decrypt(row.getApiKeyCipher());
        return (decrypted == null || decrypted.isBlank()) ? "环境变量" : "数据库";
    }

    private String resolveKeyForTest(UpdateAiConfigReq req, AiProviderConfig row) {
        String incoming = req.getApiKey();
        if (incoming != null && !incoming.isBlank() && !incoming.contains("****")) {
            return incoming.trim();
        }
        return effectiveApiKey(row);
    }

    private String require(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }

    private int orDefault(Integer value, Integer fallback) {
        return value != null ? value : (fallback != null ? fallback : 0);
    }
}
