package com.aiplatform.modules.lab.controller;

import com.aiplatform.common.Result;
import com.aiplatform.config.RateLimit;
import com.aiplatform.modules.lab.dto.LabTestReq;
import com.aiplatform.modules.lab.service.LabService;
import com.aiplatform.modules.lab.vo.LabTestVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 提示词实验室接口
 */
@RestController
@RequestMapping("/api/lab")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;

    /**
     * 测试单条提示词（同一用户每分钟最多 3 次）
     */
    @PostMapping("/test")
    @RateLimit(type = "lab", limit = 3, windowSeconds = 60)
    public Result<LabTestVO> test(@Valid @RequestBody LabTestReq req) {
        return Result.ok(labService.test(req));
    }
}
