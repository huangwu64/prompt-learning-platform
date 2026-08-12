package com.aiplatform.modules.compare.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.compare.dto.CompareReq;
import com.aiplatform.modules.compare.service.CompareService;
import com.aiplatform.modules.compare.vo.CompareVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 智能对比接口
 */
@RestController
@RequestMapping("/api/compare")
@RequiredArgsConstructor
public class CompareController {

    private final CompareService compareService;

    @PostMapping
    public Result<CompareVO> create(@Valid @RequestBody CompareReq req) {
        return Result.ok(compareService.create(SecurityUtil.currentUserId(), req));
    }

    @GetMapping("/history")
    public Result<PageResult<CompareVO>> history(@Valid PageQuery pageQuery) {
        return Result.ok(compareService.history(SecurityUtil.currentUserId(), pageQuery));
    }
}
