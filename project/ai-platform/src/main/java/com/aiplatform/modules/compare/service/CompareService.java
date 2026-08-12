package com.aiplatform.modules.compare.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.ai.ChatMessage;
import com.aiplatform.common.BizException;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.compare.dto.AiCompare;
import com.aiplatform.modules.compare.dto.CompareReq;
import com.aiplatform.modules.compare.entity.Comparison;
import com.aiplatform.modules.compare.mapper.ComparisonMapper;
import com.aiplatform.modules.compare.prompt.ComparePrompts;
import com.aiplatform.modules.compare.vo.CompareVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 智能对比：AI 差异分析 + 历史
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CompareService {

    private final ComparisonMapper comparisonMapper;
    private final AiGateway aiGateway;
    private final ObjectMapper objectMapper;

    public CompareVO create(String userId, CompareReq req) {
        AiCompare ai = aiGateway.chatJson(userId,
                List.of(ChatMessage.system(ComparePrompts.system()),
                        ChatMessage.user(ComparePrompts.buildUserMessage(
                                req.getOriginalPrompt(), req.getComparedPrompt()))),
                AiCompare.class, null);

        Comparison comparison = new Comparison();
        comparison.setUserId(userId);
        comparison.setOriginalPrompt(req.getOriginalPrompt());
        comparison.setComparedPrompt(req.getComparedPrompt());
        comparison.setAnalysis(toJson(ai));
        comparisonMapper.insert(comparison);
        log.info("创建智能对比 cmpId={} userId={}", comparison.getId(), userId);
        return CompareVO.from(comparison, objectMapper);
    }

    public PageResult<CompareVO> history(String userId, PageQuery pq) {
        Page<Comparison> page = new Page<>(pq.getPage(), pq.getPageSize());
        comparisonMapper.selectPage(page, new LambdaQueryWrapper<Comparison>()
                .eq(Comparison::getUserId, userId)
                .orderByDesc(Comparison::getCreatedAt));
        List<CompareVO> items = page.getRecords().stream()
                .map(c -> CompareVO.from(c, objectMapper)).toList();
        return PageResult.of(page, items);
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BizException(500, "数据处理异常");
        }
    }
}
