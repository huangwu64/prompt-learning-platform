-- ============================================================
-- V6：AI 提供商运行配置（支持后台修改 + 热更新）
--
-- 只存一行（provider='deepseek'）。启动时由 AiConfigService 从库里读出来
-- 解密成 AiRuntimeConfig 放进 AiConfigHolder，后台改完立即刷新 —— 无需重启。
--
-- api_key_cipher 用 AES-256-GCM 加密存储。**刻意不放种子行**：
-- 初始值由服务启动时从环境变量/yml 写入并加密，避免把密钥写进迁移文件。
-- ============================================================

CREATE TABLE IF NOT EXISTS ai_provider_config (
  id                     VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'cfg_前缀ID',
  provider               VARCHAR(32)  NOT NULL COMMENT '提供商，目前仅 deepseek',
  base_url               VARCHAR(255) NOT NULL COMMENT 'OpenAI 兼容端点根地址',
  api_key_cipher         TEXT         NULL COMMENT 'AES-256-GCM 加密的 apiKey；NULL 表示沿用环境变量',
  model                  VARCHAR(64)  NOT NULL COMMENT '如 deepseek-chat',
  daily_limit            INT          NOT NULL DEFAULT 50  COMMENT '非助手场景单用户日配额',
  assistant_daily_limit  INT          NOT NULL DEFAULT 100 COMMENT '助手单用户日配额',
  timeout_seconds        INT          NOT NULL DEFAULT 30  COMMENT '同步调用读超时',
  stream_timeout_seconds INT          NOT NULL DEFAULT 120 COMMENT '流式调用总超时',
  max_tokens             INT          NOT NULL DEFAULT 2048,
  enabled                TINYINT(1)   NOT NULL DEFAULT 1 COMMENT '关闭后 AI 相关接口一律拒绝',
  updated_by             VARCHAR(36)  NULL COMMENT '最后修改的管理员 ID',
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider (provider)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 提供商运行配置';
