package com.aiplatform.modules.templates.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.templates.dto.SaveTemplateReq;
import com.aiplatform.modules.templates.service.TemplateService;
import com.aiplatform.modules.templates.vo.TemplateVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 积木模板接口
 */
@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    public Result<PageResult<TemplateVO>> list(@Valid PageQuery pageQuery) {
        return Result.ok(templateService.list(SecurityUtil.currentUserId(), pageQuery));
    }

    @GetMapping("/{id}")
    public Result<TemplateVO> detail(@PathVariable String id) {
        return Result.ok(templateService.detail(SecurityUtil.currentUserId(), id));
    }

    @PostMapping
    public Result<TemplateVO> save(@Valid @RequestBody SaveTemplateReq req) {
        return Result.ok(templateService.save(SecurityUtil.currentUserId(), req));
    }

    @PutMapping("/{id}")
    public Result<TemplateVO> update(@PathVariable String id, @Valid @RequestBody SaveTemplateReq req) {
        return Result.ok(templateService.update(SecurityUtil.currentUserId(), id, req));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable String id) {
        templateService.delete(SecurityUtil.currentUserId(), id);
        return Result.ok();
    }
}
