-- ============================================================
-- V7：AI 用量日汇总 + 系统日志
--
-- 背景：改造前 AI 用量只存在 Redis（ai:usage:*），**没有任何历史数据**，
-- 所以后台监控的「趋势」类图表无从谈起，必须落库。
--
-- 两张表都用 BIGINT AUTO_INCREMENT 主键，**刻意偏离项目的 {前缀}_{uuid} 约定**：
-- 它们写入量最大、且不需要对外暴露业务前缀，用随机字符串主键会造成严重页分裂。
-- ============================================================

-- AI 调用日汇总：按 用户 × 日期 × 场景 聚合，供趋势统计
CREATE TABLE IF NOT EXISTS ai_usage_daily (
  id                BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id           VARCHAR(36) NOT NULL COMMENT '调用发起人',
  stat_date         DATE        NOT NULL COMMENT '统计日期',
  scope             VARCHAR(20) NOT NULL COMMENT 'socratic / assistant / tools',
  call_count        INT         NOT NULL DEFAULT 0,
  success_count     INT         NOT NULL DEFAULT 0,
  failure_count     INT         NOT NULL DEFAULT 0,
  prompt_tokens     BIGINT      NOT NULL DEFAULT 0,
  completion_tokens BIGINT      NOT NULL DEFAULT 0,
  total_tokens      BIGINT      NOT NULL DEFAULT 0,
  total_cost_ms     BIGINT      NOT NULL DEFAULT 0 COMMENT '累计耗时，均值查询时再除',
  UNIQUE KEY uk_user_date_scope (user_id, stat_date, scope),
  KEY idx_date (stat_date),
  KEY idx_scope_date (scope, stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用日汇总';

-- 系统日志：只记**错误与慢请求**（全量入库会把库写成热点）
CREATE TABLE IF NOT EXISTS system_logs (
  id          BIGINT        NOT NULL AUTO_INCREMENT PRIMARY KEY,
  trace_id    VARCHAR(32)   NULL COMMENT '与响应头 X-Trace-Id 一致，可串起同一次请求',
  level       VARCHAR(10)   NOT NULL COMMENT 'ERROR / WARN / SLOW',
  method      VARCHAR(10)   NULL,
  path        VARCHAR(300)  NULL,
  status_code INT           NULL,
  user_id     VARCHAR(36)   NULL,
  ip          VARCHAR(45)   NULL,
  cost_ms     INT           NULL,
  message     VARCHAR(1000) NULL,
  created_at  DATETIME(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY idx_created (created_at),
  KEY idx_level_created (level, created_at),
  KEY idx_path_created (path, created_at),
  KEY idx_trace (trace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统日志（错误/慢请求）';
