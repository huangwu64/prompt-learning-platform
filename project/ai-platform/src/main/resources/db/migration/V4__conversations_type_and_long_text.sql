-- ============================================================
-- V4：conversations 支持「助手」会话类型 + messages 支持长文本
--
-- 背景：全局 AI 助手复用同一张 conversations 表（而非另建 assistant_conversations），
-- 因此需要：
--   1) conversation_type 区分苏格拉底 / 助手 —— 存量行经 DEFAULT 自动落为 'socratic'
--   2) title 供助手会话自动命名
--   3) original_prompt 放开 NOT NULL —— 它是苏格拉底专属字段
--   4) messages.content 扩到 TEXT —— 助手长回复会超过原 VARCHAR(1000)
--   5) message_type 加 DEFAULT —— 助手插入不必显式指定
--
-- ⚠️ 配套代码改动（同批次必须一起上，否则助手会话会阻塞苏格拉底）：
--    ChatService 中 create 的 activeCount、history、徽章 convCount、averageRating
--    四处查询都必须补 conversation_type = 'socratic' 过滤。
-- ============================================================

ALTER TABLE conversations
  ADD COLUMN conversation_type VARCHAR(20)  NOT NULL DEFAULT 'socratic'
      COMMENT 'socratic=苏格拉底 / assistant=全局助手' AFTER user_id,
  ADD COLUMN title             VARCHAR(100) NULL
      COMMENT '会话标题（助手自动生成）' AFTER topic_id,
  MODIFY COLUMN original_prompt VARCHAR(500) NULL
      COMMENT '原始提示词（assistant 类型允许为空）',
  ADD KEY idx_user_type_status  (user_id, conversation_type, status),
  ADD KEY idx_user_type_created (user_id, conversation_type, created_at);

ALTER TABLE messages
  MODIFY COLUMN content      TEXT        NULL COMMENT '消息内容（助手长回复超出 1000 字）',
  MODIFY COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'chat'
      COMMENT 'question / answer / summary / chat',
  ADD KEY idx_conv_created (conversation_id, created_at);
