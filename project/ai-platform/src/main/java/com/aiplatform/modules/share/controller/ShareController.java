package com.aiplatform.modules.share.controller;

import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.share.service.ShareService;
import com.aiplatform.modules.share.vo.PublicWorkVO;
import com.aiplatform.modules.share.vo.ShareVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 作品分享接口
 */
@RestController
@RequiredArgsConstructor
public class ShareController {

    private final ShareService shareService;

    /** 生成分享链接（鉴权） */
    @PostMapping("/api/works/{id}/share")
    public Result<ShareVO> generate(@PathVariable String id) {
        return Result.ok(shareService.generate(SecurityUtil.currentUserId(), id));
    }

    /** 取消分享（鉴权） */
    @DeleteMapping("/api/works/{id}/share")
    public Result<Map<String, Object>> cancel(@PathVariable String id) {
        return Result.ok(shareService.cancel(SecurityUtil.currentUserId(), id));
    }

    /** 公开访问分享作品（免鉴权，已加入 Security 白名单） */
    @GetMapping("/api/share/{code}")
    public Result<PublicWorkVO> getPublic(@PathVariable String code) {
        return Result.ok(shareService.getPublic(code));
    }
}
