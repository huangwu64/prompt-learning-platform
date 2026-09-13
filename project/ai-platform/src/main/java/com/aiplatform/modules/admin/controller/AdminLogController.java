package com.aiplatform.modules.admin.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.modules.admin.service.LogQueryService;
import com.aiplatform.modules.admin.vo.SystemLogVO;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 系统日志查询（错误 / 慢请求）。
 */
@Validated
@RestController
@RequestMapping("/api/admin/logs")
@RequiredArgsConstructor
public class AdminLogController {

    private final LogQueryService logQueryService;

    @GetMapping
    public Result<PageResult<SystemLogVO>> list(
            @Valid PageQuery pageQuery,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String path,
            @RequestParam(required = false) String traceId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime from,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd HH:mm:ss") LocalDateTime to) {
        return Result.ok(logQueryService.query(level, path, traceId, userId, from, to, pageQuery));
    }

    @GetMapping("/stats")
    public Result<Map<String, Long>> stats(
            @RequestParam(defaultValue = "7") @Min(1) @Max(365) int days) {
        return Result.ok(logQueryService.stats(days));
    }
}
