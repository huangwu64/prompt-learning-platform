-- ============================================================
-- 零基础学AI平台 数据库初始化脚本（MySQL 8.0）
-- 说明：docker-compose 首次启动自动执行；本地手动执行：mysql -uroot -p < db/init.sql
-- ============================================================
CREATE DATABASE IF NOT EXISTS prompt_learning_platform
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE prompt_learning_platform;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'user_前缀ID',
  email         VARCHAR(100) NOT NULL COMMENT '登录邮箱',
  username      VARCHAR(30)  NOT NULL COMMENT '用户名',
  password_hash VARCHAR(255) NOT NULL COMMENT 'BCrypt 加密密码',
  avatar        VARCHAR(255) NULL COMMENT '头像URL',
  streak_days   INT          NOT NULL DEFAULT 0 COMMENT '连续打卡天数',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_email (email),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 登录失败记录（锁定）
CREATE TABLE IF NOT EXISTS login_attempts (
  id        BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email     VARCHAR(100) NOT NULL COMMENT '登录邮箱',
  ip        VARCHAR(45)  NOT NULL COMMENT '来源IP',
  failed_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_ip (email, ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录失败记录';

-- 苏格拉底对话表
CREATE TABLE IF NOT EXISTS conversations (
  id                VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'conv_前缀ID',
  user_id           VARCHAR(36)  NOT NULL COMMENT '用户ID',
  topic_id          VARCHAR(36)  NULL COMMENT '关联知识点ID（从学习地图跳转时携带）',
  original_prompt   VARCHAR(500) NOT NULL COMMENT '原始提示词',
  improved_prompt   TEXT         NULL COMMENT '优化后提示词',
  comparison_result JSON         NULL COMMENT '改进分析',
  rating            INT          NULL COMMENT '评分 1-5',
  status            VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT 'active / completed',
  current_round     INT          NOT NULL DEFAULT 0 COMMENT '当前轮次',
  max_rounds        INT          NOT NULL DEFAULT 5 COMMENT '最大轮次',
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_user_created (user_id, created_at),
  CONSTRAINT fk_conv_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='苏格拉底对话表';

-- 对话消息表
CREATE TABLE IF NOT EXISTS messages (
  id              VARCHAR(36)   NOT NULL PRIMARY KEY COMMENT 'msg_前缀ID',
  conversation_id VARCHAR(36)   NOT NULL COMMENT '对话ID',
  role            VARCHAR(20)   NOT NULL COMMENT 'user / assistant',
  content         VARCHAR(1000) NOT NULL COMMENT '消息内容',
  message_type    VARCHAR(20)   NOT NULL COMMENT 'question / answer / summary',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_conversation (conversation_id),
  CONSTRAINT fk_msg_conv FOREIGN KEY (conversation_id) REFERENCES conversations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='对话消息表';

-- 学习知识点（配置）
CREATE TABLE IF NOT EXISTS knowledge_points (
  id               VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'topic_前缀ID',
  stage            VARCHAR(20) NOT NULL COMMENT 'beginner/intermediate/advanced/master',
  name             VARCHAR(50) NOT NULL COMMENT '知识点名',
  sort_order       INT         NOT NULL COMMENT '阶段内排序',
  unlock_threshold FLOAT       NOT NULL DEFAULT 3.5 COMMENT '掌握所需评分阈值',
  KEY idx_stage_order (stage, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='学习知识点配置';

-- 用户知识点进度
CREATE TABLE IF NOT EXISTS user_knowledge_progress (
  id                 VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id            VARCHAR(36) NOT NULL COMMENT '用户ID',
  knowledge_point_id VARCHAR(36) NOT NULL COMMENT '知识点ID',
  status             VARCHAR(20) NOT NULL DEFAULT 'locked' COMMENT 'locked/learning/mastered',
  best_rating        FLOAT       NULL COMMENT '历史最高评分',
  updated_at         DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_kp (user_id, knowledge_point_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户知识点进度';

-- 作品表
CREATE TABLE IF NOT EXISTS works (
  id         VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'work_前缀ID',
  user_id    VARCHAR(36)  NOT NULL COMMENT '用户ID',
  work_type  VARCHAR(20)  NOT NULL COMMENT 'ppt / report / email / social',
  title      VARCHAR(100) NOT NULL COMMENT '作品标题',
  content    TEXT         NULL COMMENT '生成内容',
  form_data  JSON         NOT NULL COMMENT '表单数据',
  share_url  VARCHAR(255) NULL COMMENT '分享URL',
  share_code VARCHAR(36)  NULL COMMENT '分享码',
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_share_code (share_code),
  KEY idx_user_created (user_id, created_at),
  CONSTRAINT fk_work_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='作品表';

-- 积木模板表
CREATE TABLE IF NOT EXISTS templates (
  id         VARCHAR(36) NOT NULL PRIMARY KEY COMMENT 'tpl_前缀ID',
  user_id    VARCHAR(36) NOT NULL COMMENT '用户ID',
  name       VARCHAR(50) NOT NULL COMMENT '模板名称',
  blocks     JSON        NOT NULL COMMENT '积木块数组',
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_name (user_id, name),
  KEY idx_user_created (user_id, created_at),
  CONSTRAINT fk_tpl_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='积木模板表';

-- 智能对比记录
CREATE TABLE IF NOT EXISTS comparisons (
  id               VARCHAR(36)   NOT NULL PRIMARY KEY COMMENT 'cmp_前缀ID',
  user_id          VARCHAR(36)   NOT NULL COMMENT '用户ID',
  original_prompt  VARCHAR(2000) NOT NULL COMMENT '原始提示词',
  compared_prompt  VARCHAR(2000) NOT NULL COMMENT '待对比提示词',
  analysis         JSON          NOT NULL COMMENT '差异分析结果',
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='智能对比记录';

-- 徽章定义表
CREATE TABLE IF NOT EXISTS badges (
  id              VARCHAR(36)  NOT NULL PRIMARY KEY COMMENT 'badge_前缀ID',
  name            VARCHAR(50)  NOT NULL COMMENT '徽章名',
  description     VARCHAR(255) NOT NULL COMMENT '描述',
  unlock_criteria JSON         NOT NULL COMMENT '解锁条件',
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='徽章定义表';

-- 用户徽章关联表
CREATE TABLE IF NOT EXISTS user_badges (
  id          VARCHAR(36) NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36) NOT NULL COMMENT '用户ID',
  badge_id    VARCHAR(36) NOT NULL COMMENT '徽章ID',
  unlocked_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '解锁时间',
  UNIQUE KEY uk_user_badge (user_id, badge_id),
  CONSTRAINT fk_ub_user  FOREIGN KEY (user_id)  REFERENCES users (id),
  CONSTRAINT fk_ub_badge FOREIGN KEY (badge_id) REFERENCES badges (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户徽章关联表';
