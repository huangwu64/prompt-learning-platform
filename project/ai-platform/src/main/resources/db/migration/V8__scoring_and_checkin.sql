-- ============================================================
-- V8：系统综合评分 + 连续打卡
--
-- 背景：原先「学习地图掌握度」由**用户自己的满意度星级**（1-5 星）决定，
-- 这与产品口径不符 —— 学习分应当是系统按「完整度 + 消耗轮数」算出来的综合评分。
-- 本次改造把两者分开：
--   conversations.score          = 系统综合评分（0-100，完整度 70% + 轮数 30%）
--   conversations.rating         = 用户满意度星级（仅体验反馈，不再影响学习进度）
--
-- 因此掌握阈值要从 1-5 星口径换算到 0-100（×20）。
-- ============================================================

ALTER TABLE conversations
  ADD COLUMN score INT NULL
      COMMENT '系统综合评分 0-100（完整度70% + 轮数30%）' AFTER rating,
  ADD COLUMN element_scores JSON NULL
      COMMENT '五要素分数，供能力雷达聚合' AFTER score,
  MODIFY COLUMN rating INT NULL
      COMMENT '用户满意度星级 1-5（仅体验反馈，不影响学习进度）';

-- 打卡：完成任意一次苏格拉底对话即算当天打卡
ALTER TABLE users
  ADD COLUMN last_checkin_date DATE NULL
      COMMENT '最近一次打卡日期，用于连续天数计算' AFTER streak_days;

-- 掌握阈值换算到 0-100 口径（3.5 → 70，4.0 → 80，4.5 → 90）
UPDATE knowledge_points SET unlock_threshold = unlock_threshold * 20;
