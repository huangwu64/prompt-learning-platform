package com.aiplatform.modules.learning.mapper;

import com.aiplatform.modules.learning.entity.UserKnowledgeProgress;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户知识点进度 Mapper
 */
@Mapper
public interface UserKnowledgeProgressMapper extends BaseMapper<UserKnowledgeProgress> {
}
