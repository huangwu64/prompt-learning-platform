-- ============================================================
-- V5：头像上传 + 三态审核
--
-- 双槽位语义（关键，别混淆）：
--   users.avatar            = 当前**对外可见**的头像，只在审核通过后写入
--   users.avatar_pending_url = 待审候选，审核结束后清空
--
-- 状态机：
--   none ──上传──> pending ──通过──> approved
--                     │
--                     └──驳回(理由必填)──> rejected ──重新上传──> pending
--
-- 驳回时 users.avatar 保持原值不变 —— 用户不能因为一次驳回就丢掉已有头像；
-- 若用户从未有过头像，前端回落默认占位。
--
-- 每次提交都往 avatar_reviews INSERT 新行（不覆盖），保留完整审核留痕：
-- 谁、什么时候、通过还是驳回、理由是什么。
-- ============================================================

ALTER TABLE users
  ADD COLUMN avatar_status        VARCHAR(20)  NOT NULL DEFAULT 'none'
      COMMENT 'none/pending/approved/rejected' AFTER avatar,
  ADD COLUMN avatar_pending_url   VARCHAR(255) NULL
      COMMENT '待审头像URL（审核结束后清空）' AFTER avatar_status,
  ADD COLUMN avatar_reject_reason VARCHAR(255) NULL
      COMMENT '最近一次驳回理由（供用户端展示）' AFTER avatar_pending_url,
  ADD KEY idx_avatar_status (avatar_status);

-- 存量头像视为已通过（长度上限与 avatar 列一致，保证 UPDATE 必然成立）
UPDATE users SET avatar_status = 'approved' WHERE avatar IS NOT NULL AND avatar <> '';

CREATE TABLE IF NOT EXISTS avatar_reviews (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'av_前缀ID',
  user_id       VARCHAR(36)  NOT NULL COMMENT '提交人',
  avatar_url    VARCHAR(255) NOT NULL COMMENT '本次提交的文件路径',
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  reject_reason VARCHAR(255) NULL COMMENT '驳回理由',
  reviewer_id   VARCHAR(36)  NULL COMMENT '审核管理员ID',
  reviewed_at   DATETIME     NULL COMMENT '审核时间',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  KEY idx_status_created (status, created_at),
  KEY idx_user_created (user_id, created_at),
  CONSTRAINT fk_ar_user     FOREIGN KEY (user_id)     REFERENCES users (id),
  CONSTRAINT fk_ar_reviewer FOREIGN KEY (reviewer_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='头像审核记录';
