package com.aiplatform.modules.badges.controller;

import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.badges.service.BadgeService;
import com.aiplatform.modules.badges.vo.BadgeVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 徽章接口
 */
@RestController
@RequestMapping("/api/badges")
@RequiredArgsConstructor
public class BadgeController {

    private final BadgeService badgeService;

    @GetMapping
    public Result<Map<String, List<BadgeVO>>> list() {
        return Result.ok(Map.of("badges", badgeService.list(SecurityUtil.currentUserId())));
    }
}
