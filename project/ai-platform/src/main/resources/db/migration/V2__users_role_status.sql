-- ============================================================
-- V2：用户角色、账号状态、最近登录时间
--
-- role/status 是管理后台权限体系的基础。默认值刻意让存量用户
-- 自动落入 'USER' / 'active'，无需回填。
-- ============================================================

ALTER TABLE users
  ADD COLUMN role          VARCHAR(20)  NOT NULL DEFAULT 'USER'   COMMENT 'USER / ADMIN' AFTER password_hash,
  ADD COLUMN status        VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT 'active / disabled / deleted' AFTER role,
  ADD COLUMN last_login_at DATETIME     NULL COMMENT '最近登录时间（活跃用户统计口径）' AFTER streak_days,
  ADD KEY idx_role (role),
  ADD KEY idx_status_created (status, created_at);
