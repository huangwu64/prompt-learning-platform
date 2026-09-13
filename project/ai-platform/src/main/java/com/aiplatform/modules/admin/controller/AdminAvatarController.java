package com.aiplatform.modules.admin.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.modules.admin.dto.RejectAvatarReq;
import com.aiplatform.modules.admin.service.AvatarReviewService;
import com.aiplatform.modules.admin.vo.AvatarReviewVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 头像审核（管理端）。
 *
 * /api/admin/** 的路由级鉴权在 SecurityConfig（hasRole("ADMIN")），
 * Service 层另有 SecurityUtil.requireAdmin() 作为防御性校验。
 */
@RestController
@RequestMapping("/api/admin/avatars")
@RequiredArgsConstructor
public class AdminAvatarController {

    private final AvatarReviewService avatarReviewService;

    /** 审核列表，status 可筛 pending/approved/rejected */
    @GetMapping
    public Result<PageResult<AvatarReviewVO>> list(@Valid PageQuery pageQuery,
                                                   @RequestParam(required = false) String status) {
        return Result.ok(avatarReviewService.list(status, pageQuery));
    }

    /** 各状态计数 */
    @GetMapping("/stats")
    public Result<Map<String, Long>> stats() {
        return Result.ok(avatarReviewService.stats());
    }

    @PostMapping("/{id}/approve")
    public Result<AvatarReviewVO> approve(@PathVariable String id) {
        return Result.ok(avatarReviewService.approve(id));
    }

    @PostMapping("/{id}/reject")
    public Result<AvatarReviewVO> reject(@PathVariable String id, @Valid @RequestBody RejectAvatarReq req) {
        return Result.ok(avatarReviewService.reject(id, req.getReason()));
    }
}
