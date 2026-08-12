package com.aiplatform.modules.lab.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.ai.AiResponse;
import com.aiplatform.config.AiProperties;
import com.aiplatform.modules.lab.dto.LabTestReq;
import com.aiplatform.modules.lab.vo.LabTestVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

/**
 * 提示词实验室服务单元测试
 */
@ExtendWith(MockitoExtension.class)
class LabServiceTest {

    @Mock
    private AiGateway aiGateway;
    @Mock
    private AiProperties aiProperties;
    @InjectMocks
    private LabService labService;

    @Test
    void test_success() {
        AiResponse resp = new AiResponse("测试结果", 10, 20, 30);
        when(aiGateway.chatTextDetail(any(), anyList(), any(), any())).thenReturn(resp);
        AiProperties.Deepseek deepseek = new AiProperties.Deepseek();
        deepseek.setModel("deepseek-chat");
        when(aiProperties.getDeepseek()).thenReturn(deepseek);

        LabTestReq req = new LabTestReq();
        req.setPrompt("请解释什么是提示词工程");
        LabTestVO vo = labService.test(req);

        assertEquals("测试结果", vo.getResult());
        assertEquals("deepseek-chat", vo.getModel());
        assertEquals(30, vo.getUsage().getTotalTokens());
    }
}
