package com.aiplatform.modules.lab.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.ai.AiResponse;
import com.aiplatform.ai.ChatMessage;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.config.AiProperties;
import com.aiplatform.modules.lab.dto.LabTestReq;
import com.aiplatform.modules.lab.vo.LabTestVO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 提示词实验室：单提示词测试
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LabService {

    private final AiGateway aiGateway;
    private final AiProperties aiProperties;

    public LabTestVO test(LabTestReq req) {
        long start = System.currentTimeMillis();
        AiResponse resp = aiGateway.chatTextDetail(
                SecurityUtil.currentUserId(),
                List.of(ChatMessage.user(req.getPrompt())),
                req.getMaxTokens(),
                req.getTemperature());
        double duration = (System.currentTimeMillis() - start) / 1000.0;
        log.info("实验室测试 promptLen={} cost={}s", req.getPrompt().length(), duration);

        return new LabTestVO(
                resp.content(),
                aiProperties.getDeepseek().getModel(),
                new LabTestVO.Usage(resp.promptTokens(), resp.completionTokens(), resp.totalTokens()),
                Math.round(duration * 10) / 10.0);
    }
}
