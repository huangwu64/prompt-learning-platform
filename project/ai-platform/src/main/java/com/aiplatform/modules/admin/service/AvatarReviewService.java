package com.aiplatform.modules.admin.service;

import com.aiplatform.common.BizException;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.storage.LocalFileStorage;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.admin.vo.AvatarReviewVO;
import com.aiplatform.modules.auth.entity.User;
import com.aiplatform.modules.auth.mapper.UserMapper;
import com.aiplatform.modules.profile.entity.AvatarReview;
import com.aiplatform.modules.profile.mapper.AvatarReviewMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 头像审核（管理端）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AvatarReviewService {

    private final AvatarReviewMapper avatarReviewMapper;
    private final UserMapper userMapper;
    private final LocalFileStorage storage;

    public PageResult<AvatarReviewVO> list(String status, PageQuery pq) {
        Page<AvatarReview> page = new Page<>(pq.getPage(), pq.getPageSize());
        LambdaQueryWrapper<AvatarReview> qw = new LambdaQueryWrapper<AvatarReview>()
                .orderByDesc(AvatarReview::getCreatedAt);
        if (status != null && !status.isBlank()) {
            qw.eq(AvatarReview::getStatus, status);
        }
        avatarReviewMapper.selectPage(page, qw);
        return PageResult.of(page, toVOs(page.getRecords()));
    }

    /** 各状态计数，供后台角标与概览使用 */
    public Map<String, Long> stats() {
        Map<String, Long> result = new LinkedHashMap<>();
        for (String status : List.of(AvatarReview.STATUS_PENDING,
                AvatarReview.STATUS_APPROVED, AvatarReview.STATUS_REJECTED)) {
            result.put(status, avatarReviewMapper.selectCount(
                    new LambdaQueryWrapper<AvatarReview>().eq(AvatarReview::getStatus, status)));
        }
        return result;
    }

    /** 通过：把待审头像提升为生效头像，并清理旧文件 */
    @Transactional
    public AvatarReviewVO approve(String reviewId) {
        SecurityUtil.requireAdmin();
        String reviewerId = SecurityUtil.currentUserId();

        AvatarReview review = requirePending(reviewId);
        User owner = userMapper.selectById(review.getUserId());
        String oldAvatar = owner == null ? null : owner.getAvatar();

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, review.getUserId())
                .set(User::getAvatar, review.getAvatarUrl())
                .set(User::getAvatarStatus, AvatarReview.STATUS_APPROVED)
                .set(User::getAvatarPendingUrl, null)
                .set(User::getAvatarRejectReason, null));

        markReviewed(reviewId, AvatarReview.STATUS_APPROVED, null, reviewerId);

        // 旧文件清理放在最后：失败也不该回滚审核结果
        if (oldAvatar != null && !oldAvatar.equals(review.getAvatarUrl())) {
            storage.deleteAvatarQuietly(oldAvatar);
        }
        log.info("头像审核通过 reviewId={} userId={} reviewerId={}", reviewId, review.getUserId(), reviewerId);
        return reload(reviewId);
    }

    /** 驳回：users.avatar 保持旧值不变（用户不因一次驳回丢头像），只记状态与理由 */
    @Transactional
    public AvatarReviewVO reject(String reviewId, String reason) {
        SecurityUtil.requireAdmin();
        String reviewerId = SecurityUtil.currentUserId();
        String trimmed = reason == null ? "" : reason.trim();
        if (trimmed.length() < 2) {
            throw new BizException(400, "请填写驳回理由");
        }

        AvatarReview review = requirePending(reviewId);

        userMapper.update(null, new LambdaUpdateWrapper<User>()
                .eq(User::getId, review.getUserId())
                .set(User::getAvatarStatus, AvatarReview.STATUS_REJECTED)
                .set(User::getAvatarPendingUrl, null)
                .set(User::getAvatarRejectReason, trimmed));

        markReviewed(reviewId, AvatarReview.STATUS_REJECTED, trimmed, reviewerId);

        // 被驳回的文件不再需要，删掉不留垃圾
        storage.deleteAvatarQuietly(review.getAvatarUrl());

        log.info("头像审核驳回 reviewId={} userId={} reviewerId={}", reviewId, review.getUserId(), reviewerId);
        return reload(reviewId);
    }

    // ==================== 私有工具 ====================

    /** 只有 pending 的记录可被审核；重复操作要明确拒绝而不是默默覆盖留痕 */
    private AvatarReview requirePending(String reviewId) {
        AvatarReview review = avatarReviewMapper.selectById(reviewId);
        if (review == null) {
            throw new BizException(404, "审核记录不存在");
        }
        if (!AvatarReview.STATUS_PENDING.equals(review.getStatus())) {
            throw new BizException(400, "该头像已审核过，无法重复操作");
        }
        return review;
    }

    private void markReviewed(String reviewId, String status, String rejectReason, String reviewerId) {
        avatarReviewMapper.update(null, new LambdaUpdateWrapper<AvatarReview>()
                .eq(AvatarReview::getId, reviewId)
                .set(AvatarReview::getStatus, status)
                .set(AvatarReview::getRejectReason, rejectReason)
                .set(AvatarReview::getReviewerId, reviewerId)
                .set(AvatarReview::getReviewedAt, LocalDateTime.now()));
    }

    private AvatarReviewVO reload(String reviewId) {
        return toVOs(List.of(avatarReviewMapper.selectById(reviewId))).get(0);
    }

    /** 批量补用户信息，避免列表接口 N+1 */
    private List<AvatarReviewVO> toVOs(List<AvatarReview> reviews) {
        if (reviews.isEmpty()) {
            return List.of();
        }
        Set<String> ids = new HashSet<>();
        for (AvatarReview r : reviews) {
            if (r.getUserId() != null) ids.add(r.getUserId());
            if (r.getReviewerId() != null) ids.add(r.getReviewerId());
        }
        Map<String, User> users = userMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        return reviews.stream()
                .map(r -> AvatarReviewVO.of(r,
                        users.get(r.getUserId()),
                        r.getReviewerId() == null ? null : users.get(r.getReviewerId())))
                .toList();
    }
}
