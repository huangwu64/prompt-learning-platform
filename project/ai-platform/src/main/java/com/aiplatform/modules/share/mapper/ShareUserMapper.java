package com.aiplatform.modules.share.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * 分享模块只读查询（避免与 auth 模块形成依赖）
 */
@Mapper
public interface ShareUserMapper {

    @Select("SELECT username FROM users WHERE id = #{userId}")
    String username(@Param("userId") String userId);
}
