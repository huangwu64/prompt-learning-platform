package com.aiplatform.modules.admin.service;

import com.aiplatform.common.BizException;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.config.JwtAuthenticationFilter;
import com.aiplatform.modules.admin.dto.CreateUserReq;
import com.aiplatform.modules.admin.dto.UpdateUserReq;
import com.aiplatform.modules.admin.mapper.AdminUserQueryMapper;
import com.aiplatform.modules.admin.vo.AdminUserVO;
import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.auth.mapper.UserMapper;
import com.aiplatform.modules.profile.entity.AvatarReview;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 用户管理（管理端）。
 *
 * 与各业务模块的约定不同：这里**故意跨用户查询**，不走 "userId 作首参 + requireOwned"
 * 那套归属校验模式 —— 管理后台的职责本就如此。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AdminUserService {

    /** 标记位存活时间：略长于 JWT 的 7 天有效期，保证标记不会先于 token 失效 */
    private static final Duration FLAG_TTL = Duration.ofDays(8);

    private static final String AVATAR_PATH_PREFIX = "/uploads/avatars/";

    private final UserMapper userMapper;
    private final AdminUserQueryMapper queryMapper;
    private final PasswordEncoder passwordEncoder;
    private final RedisTemplate<String, Object> redisTemplate;

    // ==================== 查询 ====================

    public PageResult<AdminUserVO> list(String keyword, String role, String status, PageQuery pq) {
        Page<User> page = new Page<>(pq.getPage(), pq.getPageSize());

        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isBlank()) {
            String kw = keyword.trim();
            // 关键词同时匹配用户名与邮箱，用 and(...) 包住 or() 避免优先级问题
            qw.and(w -> w.like(User::getUsername, kw).or().like(User::getEmail, kw));
        }
        if (role != null && !role.isBlank()) {
            qw.eq(User::getRole, role);
        }
        if (status != null && !status.isBlank()) {
            qw.eq(User::getStatus, status);
        }
        qw.orderByDesc(User::getCreatedAt);
        userMapper.selectPage(page, qw);

        return PageResult.of(page, toVOs(page.getRecords()));
    }

    public AdminUserVO detail(String id) {
        return toVOs(List.of(requireUser(id))).get(0);
    }

    // ==================== 写入 ====================

    @Transactional
    public AdminUserVO create(CreateUserReq req) {
        checkEmailFree(req.getEmail(), null);
        checkUsernameFree(req.getUsername(), null);

        User user = new User();
        user.setEmail(req.getEmail().trim());
        user.setUsername(req.getUsername().trim());
        user.setPasswordHash(passwordEncoder.encode(req.getPassword()));
        user.setRole(req.getRole() == null || req.getRole().isBlank() ? "USER" : req.getRole());
        user.setStatus("active");
        user.setStreakDays(0);
        userMapper.insert(user);

        log.info("管理员新建用户 userId={} email={} role={} by={}",
                user.getId(), user.getEmail(), user.getRole(), SecurityUtil.currentUserId());
        return toVOs(List.of(user)).get(0);
    }

    @Transactional
    public AdminUserVO update(String id, UpdateUserReq req) {
        requireUser(id);
        checkEmailFree(req.getEmail(), id);
        checkUsernameFree(req.getUsername(), id);

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, id)
                .set(User::getEmail, req.getEmail().trim())
                .set(User::getUsername, req.getUsername().trim()));
        log.info("管理员修改用户资料 userId={} by={}", id, SecurityUtil.currentUserId());
        return detail(id);
    }

    @Transactional
    public AdminUserVO updateRole(String id, String role) {
        SecurityUtil.requireAdmin();
        String operator = SecurityUtil.currentUserId();
        User user = requireUser(id);

        if (id.equals(operator)) {
            throw new BizException(400, "不能修改自己的角色");
        }
        if ("ADMIN".equals(user.getRole()) && !"ADMIN".equals(role)) {
            ensureNotLastAdmin("不能移除最后一个管理员，否则后台会永久锁死");
        }

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, id).set(User::getRole, role));

        // 秒级生效：过滤器优先读标记位，不必等对方旧 token 的 7 天到期
        redisTemplate.opsForValue().set(JwtAuthenticationFilter.KEY_ROLE + id, role, FLAG_TTL);

        log.info("管理员改角色 userId={} {} -> {} by={}", id, user.getRole(), role, operator);
        return detail(id);
    }

    @Transactional
    public AdminUserVO updateStatus(String id, String status) {
        SecurityUtil.requireAdmin();
        String operator = SecurityUtil.currentUserId();
        User user = requireUser(id);

        if (id.equals(operator)) {
            throw new BizException(400, "不能禁用自己的账号");
        }
        if ("disabled".equals(status) && "ADMIN".equals(user.getRole())) {
            ensureNotLastAdmin("不能禁用最后一个管理员");
        }

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, id).set(User::getStatus, status));

        String key = JwtAuthenticationFilter.KEY_DISABLED + id;
        if ("disabled".equals(status)) {
            redisTemplate.opsForValue().set(key, "1", FLAG_TTL);
        } else {
            redisTemplate.delete(key);
        }

        log.info("管理员{}用户 userId={} by={}", "disabled".equals(status) ? "禁用" : "启用", id, operator);
        return detail(id);
    }

    /** 重置密码。管理员自行输入新密码，系统不回显也不生成 —— 密码是哈希存储的，本来就看不到原值 */
    @Transactional
    public void resetPassword(String id, String newPassword) {
        requireUser(id);
        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, id)
                .set(User::getPasswordHash, passwordEncoder.encode(newPassword)));
        log.info("管理员重置密码 userId={} by={}", id, SecurityUtil.currentUserId());
    }

    /**
     * 管理员直接设定头像 —— **跳过审核**的特权通道。
     * 因此只接受本服务已上传文件的路径，不接受任意外链（否则等于给了个 XSS/追踪像素入口）。
     */
    @Transactional
    public AdminUserVO setAvatar(String id, String avatarUrl) {
        requireUser(id);
        if (!avatarUrl.startsWith(AVATAR_PATH_PREFIX)) {
            throw new BizException(400, "头像地址必须来自本服务上传的文件");
        }
        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, id)
                .set(User::getAvatar, avatarUrl)
                .set(User::getAvatarStatus, AvatarReview.STATUS_APPROVED)
                .set(User::getAvatarPendingUrl, null)
                .set(User::getAvatarRejectReason, null));
        log.info("管理员直接设定头像 userId={} by={}", id, SecurityUtil.currentUserId());
        return detail(id);
    }

    /**
     * 软删。
     *
     * 硬删会撞外键 —— conversations / works / templates / user_badges 都指向 users(id)，
     * 要么被拒、要么留下孤儿数据，且历史统计会凭空减少。
     * 这里置 deleted 并**混淆邮箱与用户名**以释放唯一键，用户数据本身保留。
     */
    @Transactional
    public void delete(String id) {
        SecurityUtil.requireAdmin();
        String operator = SecurityUtil.currentUserId();
        User user = requireUser(id);

        if (id.equals(operator)) {
            throw new BizException(400, "不能删除自己的账号");
        }
        if ("ADMIN".equals(user.getRole())) {
            ensureNotLastAdmin("不能删除最后一个管理员");
        }

        String suffix = id.replaceAll("[^A-Za-z0-9]", "");
        String newName = "已删除" + suffix;
        if (newName.length() > 30) {
            newName = newName.substring(0, 30);
        }

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, id)
                .set(User::getStatus, "deleted")
                .set(User::getEmail, "deleted_" + suffix + "@spark.invalid")
                .set(User::getUsername, newName));

        // 立即失效：避免被删用户凭旧 token 继续访问
        redisTemplate.opsForValue().set(JwtAuthenticationFilter.KEY_DISABLED + id, "1", FLAG_TTL);

        log.info("管理员软删用户 userId={} by={}", id, operator);
    }

    // ==================== 私有工具 ====================

    private User requireUser(String id) {
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BizException(404, "用户不存在");
        }
        return user;
    }

    /** 至少保留一个 active 管理员，否则后台永久锁死、只能改库 */
    private void ensureNotLastAdmin(String message) {
        Long admins = userMapper.selectCount(new LambdaQueryWrapper<User>()
                .eq(User::getRole, "ADMIN")
                .eq(User::getStatus, "active"));
        if (admins == null || admins <= 1) {
            throw new BizException(400, message);
        }
    }

    private void checkEmailFree(String email, String selfId) {
        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<User>().eq(User::getEmail, email.trim());
        if (selfId != null) {
            qw.ne(User::getId, selfId);
        }
        if (userMapper.selectCount(qw) > 0) {
            throw new BizException(400, "该邮箱已被使用");
        }
    }

    private void checkUsernameFree(String username, String selfId) {
        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<User>().eq(User::getUsername, username.trim());
        if (selfId != null) {
            qw.ne(User::getId, selfId);
        }
        if (userMapper.selectCount(qw) > 0) {
            throw new BizException(400, "该用户名已被使用");
        }
    }

    /** 批量补会话数/作品数，避免列表接口 N+1 */
    private List<AdminUserVO> toVOs(List<User> users) {
        if (users.isEmpty()) {
            return List.of();
        }
        List<String> ids = users.stream().map(User::getId).toList();
        Map<String, Long> convCounts = toCountMap(queryMapper.countConversations(ids));
        Map<String, Long> workCounts = toCountMap(queryMapper.countWorks(ids));

        return users.stream()
                .map(u -> AdminUserVO.of(u,
                        convCounts.getOrDefault(u.getId(), 0L),
                        workCounts.getOrDefault(u.getId(), 0L)))
                .toList();
    }

    private Map<String, Long> toCountMap(List<AdminUserQueryMapper.UserCount> rows) {
        return rows.stream().collect(Collectors.toMap(
                AdminUserQueryMapper.UserCount::getUserId,
                r -> r.getCnt() == null ? 0L : r.getCnt(),
                (a, b) -> a));
    }
}
