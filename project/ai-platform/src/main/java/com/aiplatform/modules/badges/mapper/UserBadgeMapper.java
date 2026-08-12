package com.aiplatform.modules.badges.mapper;

import com.aiplatform.modules.badges.entity.UserBadge;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 用户徽章 Mapper
 */
@Mapper
public interface UserBadgeMapper extends BaseMapper<UserBadge> {
}
