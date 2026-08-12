package com.aiplatform.modules.compare.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.modules.compare.dto.AiCompare;
import com.aiplatform.modules.compare.dto.CompareReq;
import com.aiplatform.modules.compare.entity.Comparison;
import com.aiplatform.modules.compare.mapper.ComparisonMapper;
import com.aiplatform.modules.compare.vo.CompareVO;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 智能对比服务单元测试
 */
@ExtendWith(MockitoExtension.class)
class CompareServiceTest {

    @Mock
    private ComparisonMapper comparisonMapper;
    @Mock
    private AiGateway aiGateway;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks
    private CompareService compareService;

    @Test
    void create_success() {
        AiCompare ai = new AiCompare();
        ai.setImprovements(List.of());
        AiCompare.ScoreComparison sc = new AiCompare.ScoreComparison();
        sc.setOriginalScore(35);
        sc.setComparedScore(88);
        sc.setImprovement(53);
        ai.setScoreComparison(sc);
        when(aiGateway.chatJson(any(), anyList(), eq(AiCompare.class), any())).thenReturn(ai);

        CompareReq req = new CompareReq();
        req.setOriginalPrompt("帮我写个邮件");
        req.setComparedPrompt("你是一位资深HR，请帮我...");
        CompareVO vo = compareService.create("user_1", req);

        assertNotNull(vo);
        verify(comparisonMapper).insert(any(Comparison.class));
    }

    @Test
    void history_returnsPage() {
        when(comparisonMapper.selectPage(any(), any())).thenAnswer(inv -> {
            @SuppressWarnings("unchecked")
            Page<Comparison> page = inv.getArgument(0);
            page.setTotal(1);
            page.setRecords(List.of(new Comparison()));
            return page;
        });

        PageResult<CompareVO> result = compareService.history("user_1", new PageQuery());

        assertNotNull(result);
        assertNotNull(result.getItems());
    }
}
