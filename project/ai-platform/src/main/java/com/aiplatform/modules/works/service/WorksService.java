package com.aiplatform.modules.works.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.ai.ChatMessage;
import com.aiplatform.common.BizException;
import com.aiplatform.modules.badges.service.BadgeService;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.works.dto.CreateWorkReq;
import com.aiplatform.modules.works.entity.Work;
import com.aiplatform.modules.works.mapper.WorkMapper;
import com.aiplatform.modules.works.prompt.WorkPrompts;
import com.aiplatform.modules.works.vo.WorkVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 作品工厂：模板编排 + AI 生成 + CRUD
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorksService {

    private static final Map<String, Set<String>> REQUIRED_FIELDS = Map.of(
            "ppt", Set.of("topic", "audience", "duration", "keyPoints"),
            "report", Set.of("title", "keyPoints", "style", "wordCount"),
            "email", Set.of("recipient", "purpose", "tone", "attachment"),
            "social", Set.of("platform", "product", "style", "goal"));

    private final WorkMapper workMapper;
    private final AiGateway aiGateway;
    private final BadgeService badgeService;
    private final ObjectMapper objectMapper;

    public WorkVO create(String userId, CreateWorkReq req) {
        validateFormData(req.getWorkType(), req.getFormData());

        long start = System.currentTimeMillis();
        String content = aiGateway.chatText(userId,
                List.of(ChatMessage.system(WorkPrompts.system(req.getWorkType())),
                        ChatMessage.user(WorkPrompts.buildRequest(req.getFormData()))),
                2048);
        log.info("作品生成 workType={} title={} cost={}ms",
                req.getWorkType(), req.getTitle(), System.currentTimeMillis() - start);

        Work work = new Work();
        work.setUserId(userId);
        work.setWorkType(req.getWorkType());
        work.setTitle(req.getTitle());
        work.setContent(content);
        work.setFormData(toJson(req.getFormData()));
        workMapper.insert(work);

        // 徽章触发：累计作品数
        long workCount = workMapper.selectCount(new LambdaQueryWrapper<Work>()
                .eq(Work::getUserId, userId));
        badgeService.checkAndUnlock(userId, "works_count", (int) workCount);

        return WorkVO.from(work, objectMapper);
    }

    public PageResult<WorkVO> list(String userId, PageQuery pq, String workType) {
        Page<Work> page = new Page<>(pq.getPage(), pq.getPageSize());
        LambdaQueryWrapper<Work> qw = new LambdaQueryWrapper<Work>()
                .eq(Work::getUserId, userId)
                .orderByDesc(Work::getCreatedAt);
        if (workType != null && !workType.isBlank()) {
            qw.eq(Work::getWorkType, workType);
        }
        workMapper.selectPage(page, qw);
        List<WorkVO> items = page.getRecords().stream()
                .map(w -> WorkVO.from(w, objectMapper)).toList();
        return PageResult.of(page, items);
    }

    public WorkVO detail(String userId, String id) {
        return WorkVO.from(requireOwned(userId, id), objectMapper);
    }

    public Map<String, Object> delete(String userId, String id) {
        requireOwned(userId, id);
        workMapper.deleteById(id);
        return Map.of("id", id, "deleted", true);
    }

    // ============ 私有 ============

    /** 按 workType 校验 formData 必填字段 */
    private void validateFormData(String workType, Map<String, Object> formData) {
        Set<String> required = REQUIRED_FIELDS.get(workType);
        if (required == null) {
            throw new BizException(400, "作品类型不合法");
        }
        for (String field : required) {
            Object value = formData.get(field);
            if (value == null || (value instanceof String s && s.isBlank())) {
                throw new BizException(400, "表单数据不完整");
            }
        }
    }

    private Work requireOwned(String userId, String id) {
        Work work = workMapper.selectById(id);
        if (work == null) {
            throw new BizException(404, "作品不存在");
        }
        if (!userId.equals(work.getUserId())) {
            throw new BizException(403, "无权访问该作品");
        }
        return work;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BizException(500, "数据处理异常");
        }
    }
}
