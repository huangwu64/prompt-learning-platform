package com.aiplatform.modules.admin.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.modules.admin.dto.CreateUserReq;
import com.aiplatform.modules.admin.dto.ResetPasswordReq;
import com.aiplatform.modules.admin.dto.SetAvatarReq;
import com.aiplatform.modules.admin.dto.UpdateUserReq;
import com.aiplatform.modules.admin.dto.UpdateUserRoleReq;
import com.aiplatform.modules.admin.dto.UpdateUserStatusReq;
import com.aiplatform.modules.admin.service.AdminUserService;
import com.aiplatform.modules.admin.vo.AdminUserVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户管理（管理端）。
 *
 * 拆成多个细粒度接口而不是一个 PUT 全量更新：改角色、改状态、重置密码
 * 各自有完全不同的安全栏杆，混在一起容易漏校验。
 *
 * 用户 ID 是主键，**只读**，不提供任何修改入口。
 */
@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService adminUserService;

    /** 列表：关键词同时匹配用户名与邮箱 */
    @GetMapping
    public Result<PageResult<AdminUserVO>> list(@Valid PageQuery pageQuery,
                                                @RequestParam(required = false) String keyword,
                                                @RequestParam(required = false) String role,
                                                @RequestParam(required = false) String status) {
        return Result.ok(adminUserService.list(keyword, role, status, pageQuery));
    }

    @GetMapping("/{id}")
    public Result<AdminUserVO> detail(@PathVariable String id) {
        return Result.ok(adminUserService.detail(id));
    }

    @PostMapping
    public Result<AdminUserVO> create(@Valid @RequestBody CreateUserReq req) {
        return Result.ok(adminUserService.create(req));
    }

    /** 修改联系方式（用户名 / 邮箱） */
    @PutMapping("/{id}")
    public Result<AdminUserVO> update(@PathVariable String id, @Valid @RequestBody UpdateUserReq req) {
        return Result.ok(adminUserService.update(id, req));
    }

    @PutMapping("/{id}/role")
    public Result<AdminUserVO> updateRole(@PathVariable String id, @Valid @RequestBody UpdateUserRoleReq req) {
        return Result.ok(adminUserService.updateRole(id, req.getRole()));
    }

    @PutMapping("/{id}/status")
    public Result<AdminUserVO> updateStatus(@PathVariable String id, @Valid @RequestBody UpdateUserStatusReq req) {
        return Result.ok(adminUserService.updateStatus(id, req.getStatus()));
    }

    /** 重置密码。管理员自行输入新密码，响应不回显任何密码信息 */
    @PostMapping("/{id}/password")
    public Result<Void> resetPassword(@PathVariable String id, @Valid @RequestBody ResetPasswordReq req) {
        adminUserService.resetPassword(id, req.getNewPassword());
        return Result.ok();
    }

    /** 直接设定头像（跳过审核的特权通道，仅接受本服务上传的文件路径） */
    @PutMapping("/{id}/avatar")
    public Result<AdminUserVO> setAvatar(@PathVariable String id, @Valid @RequestBody SetAvatarReq req) {
        return Result.ok(adminUserService.setAvatar(id, req.getAvatar()));
    }

    /** 删除（软删：置 deleted 并混淆邮箱用户名，保留其历史数据） */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        adminUserService.delete(id);
        return Result.ok();
    }
}
