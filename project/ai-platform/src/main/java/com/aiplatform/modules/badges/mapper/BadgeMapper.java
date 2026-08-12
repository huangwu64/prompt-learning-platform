package com.aiplatform.modules.badges.mapper;

import com.aiplatform.modules.badges.entity.Badge;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 徽章定义 Mapper
 */
@Mapper
public interface BadgeMapper extends BaseMapper<Badge> {
}
