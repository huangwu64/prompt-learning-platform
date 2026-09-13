package com.aiplatform.modules.profile.service;

import com.aiplatform.common.BizException;
import com.aiplatform.common.storage.LocalFileStorage;
import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.auth.mapper.UserMapper;
import com.aiplatform.modules.profile.dto.ChangePasswordReq;
import com.aiplatform.modules.profile.dto.UpdateProfileReq;
import com.aiplatform.modules.profile.entity.AvatarReview;
import com.aiplatform.modules.profile.mapper.AvatarReviewMapper;
import com.aiplatform.modules.profile.vo.AvatarStatusVO;
import com.aiplatform.modules.profile.vo.ProfileVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;

/**
 * 个人资料：查看 / 改用户名 / 改密码 / 提交头像审核
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserMapper userMapper;
    private final AvatarReviewMapper avatarReviewMapper;
    private final LocalFileStorage storage;
    private final PasswordEncoder passwordEncoder;

    public ProfileVO get(String userId) {
        return ProfileVO.from(requireUser(userId));
    }

    public AvatarStatusVO avatarStatus(String userId) {
        User user = requireUser(userId);
        return AvatarStatusVO.of(user, latestReview(userId));
    }

    @Transactional
    public ProfileVO update(String userId, UpdateProfileReq req) {
        User user = requireUser(userId);
        String username = req.getUsername().trim();

        if (!username.equals(user.getUsername())) {
            Long taken = userMapper.selectCount(new LambdaQueryWrapper<User>()
                    .eq(User::getUsername, username)
                    .ne(User::getId, userId));
            if (taken > 0) {
                throw new BizException(400, "该用户名已被使用");
            }
            User patch = new User();
            patch.setId(userId);
            patch.setUsername(username);
            userMapper.updateById(patch);
            user.setUsername(username);
        }
        return ProfileVO.from(user);
    }

    @Transactional
    public void changePassword(String userId, ChangePasswordReq req) {
        User user = requireUser(userId);
        if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
            throw new BizException(400, "当前密码不正确");
        }
        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new BizException(400, "新密码不能与当前密码相同");
        }

        User patch = new User();
        patch.setId(userId);
        patch.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userMapper.updateById(patch);
        log.info("用户修改密码 userId={}", userId);
    }

    /**
     * 提交头像：落盘 → 建一条 pending 审核记录 → 挂到 users.avatar_pending_url。
     * 此时 **不动 users.avatar** —— 审核通过前用户端仍显示旧头像。
     */
    @Transactional
    public AvatarStatusVO uploadAvatar(String userId, MultipartFile file) {
        User user = requireUser(userId);

        // 已有待审则拒绝：防止刷屏占满审核队列
        if (AvatarReview.STATUS_PENDING.equals(user.getAvatarStatus())) {
            throw new BizException(400, "已有头像待审核，请等待审核结果");
        }

        String url = storage.saveAvatar(userId, file);

        AvatarReview review = new AvatarReview();
        review.setUserId(userId);
        review.setAvatarUrl(url);
        review.setStatus(AvatarReview.STATUS_PENDING);
        review.setCreatedAt(LocalDateTime.now());
        avatarReviewMapper.insert(review);

        // 用 LambdaUpdateWrapper 显式 set null：updateById 会忽略 null 字段，
        // 清不掉上一轮的驳回理由
        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, userId)
                .set(User::getAvatarPendingUrl, url)
                .set(User::getAvatarStatus, AvatarReview.STATUS_PENDING)
                .set(User::getAvatarRejectReason, null));

        user.setAvatarPendingUrl(url);
        user.setAvatarStatus(AvatarReview.STATUS_PENDING);
        user.setAvatarRejectReason(null);

        log.info("头像已提交审核 userId={} reviewId={}", userId, review.getId());
        return AvatarStatusVO.of(user, review);
    }

    // ==================== 私有工具 ====================

    private User requireUser(String userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BizException(404, "用户不存在");
        }
        return user;
    }

    private AvatarReview latestReview(String userId) {
        return avatarReviewMapper.selectOne(new LambdaQueryWrapper<AvatarReview>()
                .eq(AvatarReview::getUserId, userId)
                .orderByDesc(AvatarReview::getCreatedAt)
                .last("LIMIT 1"));
    }
}
