-- ============================================================
-- V3：种子管理员账号
--
-- ⚠️ 默认密码是明文记录在仓库里的，仅用于「部署完即有可用管理员」。
--    首次登录后必须立即通过 个人中心 → 修改密码 更换；
--    （或由另一个管理员在 后台 → 用户管理 → 重置密码 更换）
--
-- 账号：admin@spark.local / admin
-- 默认密码：Spark@Admin2026
-- 此处为 BCrypt(10) 哈希，已用独立实现校验通过，$2b$ 前缀 Spring 兼容。
--
-- 用 WHERE NOT EXISTS 守卫：若该邮箱已被真实注册占用，则跳过而不报错中断迁移。
-- ============================================================

INSERT INTO users (id, email, username, password_hash, role, status, streak_days)
SELECT 'user_admin_seed_0001',
       'admin@spark.local',
       'admin',
       '$2b$10$2Mh6XsHYmOyfrmALIIFCl.QK2OTbHN0CE3I/zy6meATBjNv6NmZea',
       'ADMIN',
       'active',
       0
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@spark.local');
