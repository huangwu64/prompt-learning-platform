package com.aiplatform.modules.admin.controller;

import com.aiplatform.common.Result;
import com.aiplatform.modules.admin.dto.UpdateAiConfigReq;
import com.aiplatform.modules.admin.service.AiConfigService;
import com.aiplatform.modules.admin.vo.AiConfigTestVO;
import com.aiplatform.modules.admin.vo.AiConfigVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * AI 配置管理。
 *
 * 改完立即生效（热更新），无需重启 —— 见 AiConfigService 的生效链路。
 */
@RestController
@RequestMapping("/api/admin/config")
@RequiredArgsConstructor
public class AdminConfigController {

    private final AiConfigService aiConfigService;

    @GetMapping("/ai")
    public Result<AiConfigVO> get() {
        return Result.ok(aiConfigService.get());
    }

    @PutMapping("/ai")
    public Result<AiConfigVO> update(@Valid @RequestBody UpdateAiConfigReq req) {
        return Result.ok(aiConfigService.update(req));
    }

    /**
     * 测试连接。
     * 这里**不加 @Valid** —— 允许只填一部分字段试连（其余沿用当前生效值），
     * 否则用户得先把表单填满才能点"测试"。
     */
    @PostMapping("/ai/test")
    public Result<AiConfigTestVO> test(@RequestBody UpdateAiConfigReq req) {
        return Result.ok(aiConfigService.testConnection(req));
    }
}
