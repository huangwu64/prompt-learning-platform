package com.aiplatform.modules.learning.controller;

import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.learning.service.LearningService;
import com.aiplatform.modules.learning.vo.LearningProgressVO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 学习地图接口
 */
@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
public class LearningController {

    private final LearningService learningService;

    /**
     * 获取学习进度（统计卡片 + 四阶段技能树）
     */
    @GetMapping("/progress")
    public Result<LearningProgressVO> progress() {
        return Result.ok(learningService.getProgress(SecurityUtil.currentUserId()));
    }
}
