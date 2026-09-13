package com.aiplatform.modules.profile.controller;

import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.config.RateLimit;
import com.aiplatform.modules.profile.dto.ChangePasswordReq;
import com.aiplatform.modules.profile.dto.UpdateProfileReq;
import com.aiplatform.modules.profile.service.ProfileService;
import com.aiplatform.modules.profile.vo.AvatarStatusVO;
import com.aiplatform.modules.profile.vo.ProfileVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * 个人资料接口。
 *
 * 本模块此前目录建好但一行代码都没有 —— 前端「能力雷达」页每次进入打
 * GET /api/profile 都在 404，本次一并修掉。
 */
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;

    /** 查看个人资料 */
    @GetMapping
    public Result<ProfileVO> get() {
        return Result.ok(profileService.get(SecurityUtil.currentUserId()));
    }

    /** 修改用户名（头像走上传+审核，不在此接口） */
    @PutMapping
    public Result<ProfileVO> update(@Valid @RequestBody UpdateProfileReq req) {
        return Result.ok(profileService.update(SecurityUtil.currentUserId(), req));
    }

    /** 修改密码（需校验当前密码） */
    @PutMapping("/password")
    @RateLimit(type = "user", limit = 5, windowSeconds = 60)
    public Result<Void> changePassword(@Valid @RequestBody ChangePasswordReq req) {
        profileService.changePassword(SecurityUtil.currentUserId(), req);
        return Result.ok();
    }

    /** 查询头像状态（当前头像 / 待审 / 驳回理由） */
    @GetMapping("/avatar")
    public Result<AvatarStatusVO> avatarStatus() {
        return Result.ok(profileService.avatarStatus(SecurityUtil.currentUserId()));
    }

    /** 提交头像审核 */
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @RateLimit(type = "user", limit = 5, windowSeconds = 60)
    public Result<AvatarStatusVO> uploadAvatar(@RequestPart("file") MultipartFile file) {
        return Result.ok(profileService.uploadAvatar(SecurityUtil.currentUserId(), file));
    }
}
