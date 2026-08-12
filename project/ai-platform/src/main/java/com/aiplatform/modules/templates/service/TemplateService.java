package com.aiplatform.modules.templates.service;

import com.aiplatform.common.BizException;
import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.modules.templates.dto.SaveTemplateReq;
import com.aiplatform.modules.templates.entity.Template;
import com.aiplatform.modules.templates.mapper.TemplateMapper;
import com.aiplatform.modules.templates.vo.TemplateVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 积木模板：CRUD + 同名唯一校验
 */
@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateMapper templateMapper;
    private final ObjectMapper objectMapper;

    public PageResult<TemplateVO> list(String userId, PageQuery pq) {
        Page<Template> page = new Page<>(pq.getPage(), pq.getPageSize());
        templateMapper.selectPage(page, new LambdaQueryWrapper<Template>()
                .eq(Template::getUserId, userId)
                .orderByDesc(Template::getCreatedAt));
        List<TemplateVO> items = page.getRecords().stream()
                .map(t -> TemplateVO.from(t, objectMapper)).toList();
        return PageResult.of(page, items);
    }

    public TemplateVO detail(String userId, String id) {
        return TemplateVO.from(requireOwned(userId, id), objectMapper);
    }

    public TemplateVO save(String userId, SaveTemplateReq req) {
        if (existsByName(userId, req.getName(), null)) {
            throw new BizException(400, "模板名称已存在，请更换");
        }
        Template template = new Template();
        template.setUserId(userId);
        template.setName(req.getName());
        template.setBlocks(toJson(req.getBlocks()));
        templateMapper.insert(template);
        return TemplateVO.from(template, objectMapper);
    }

    public TemplateVO update(String userId, String id, SaveTemplateReq req) {
        Template template = requireOwned(userId, id);
        if (existsByName(userId, req.getName(), id)) {
            throw new BizException(400, "模板名称已存在，请更换");
        }
        template.setName(req.getName());
        template.setBlocks(toJson(req.getBlocks()));
        templateMapper.updateById(template);
        return TemplateVO.from(template, objectMapper);
    }

    public void delete(String userId, String id) {
        requireOwned(userId, id);
        templateMapper.deleteById(id);
    }

    // ============ 私有 ============

    /** 同名校验：excludeId 用于更新时排除自身 */
    private boolean existsByName(String userId, String name, String excludeId) {
        LambdaQueryWrapper<Template> qw = new LambdaQueryWrapper<Template>()
                .eq(Template::getUserId, userId)
                .eq(Template::getName, name);
        if (excludeId != null) {
            qw.ne(Template::getId, excludeId);
        }
        return templateMapper.selectCount(qw) > 0;
    }

    private Template requireOwned(String userId, String id) {
        Template template = templateMapper.selectById(id);
        if (template == null) {
            throw new BizException(404, "模板不存在");
        }
        if (!userId.equals(template.getUserId())) {
            throw new BizException(403, "无权访问该模板");
        }
        return template;
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BizException(500, "数据处理异常");
        }
    }
}
