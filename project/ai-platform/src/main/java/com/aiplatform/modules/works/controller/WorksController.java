package com.aiplatform.modules.works.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.works.dto.CreateWorkReq;
import com.aiplatform.modules.works.service.WorksService;
import com.aiplatform.modules.works.vo.WorkVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 作品工厂接口
 */
@RestController
@RequestMapping("/api/works")
@RequiredArgsConstructor
public class WorksController {

    private final WorksService worksService;

    @GetMapping
    public Result<PageResult<WorkVO>> list(@Valid PageQuery pageQuery,
                                           @RequestParam(required = false) String workType) {
        return Result.ok(worksService.list(SecurityUtil.currentUserId(), pageQuery, workType));
    }

    @PostMapping
    public Result<WorkVO> create(@Valid @RequestBody CreateWorkReq req) {
        return Result.ok(worksService.create(SecurityUtil.currentUserId(), req));
    }

    @GetMapping("/{id}")
    public Result<WorkVO> detail(@PathVariable String id) {
        return Result.ok(worksService.detail(SecurityUtil.currentUserId(), id));
    }

    @DeleteMapping("/{id}")
    public Result<Map<String, Object>> delete(@PathVariable String id) {
        return Result.ok(worksService.delete(SecurityUtil.currentUserId(), id));
    }
}
