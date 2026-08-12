package com.aiplatform.modules.templates.mapper;

import com.aiplatform.modules.templates.entity.Template;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 模板 Mapper
 */
@Mapper
public interface TemplateMapper extends BaseMapper<Template> {
}
