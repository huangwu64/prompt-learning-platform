package com.aiplatform.modules.admin.mapper;

import lombok.Data;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 用户管理的跨表聚合查询。
 *
 * 独立于 auth 模块的 UserMapper，避免为后台的统计需求去改登录相关的查询接口。
 * 项目不使用 XML Mapper，聚合统一用 @Select 注解。
 */
@Mapper
public interface AdminUserQueryMapper {

    /** 批量统计会话数，一次查询代替 N 次（避免列表接口 N+1） */
    @Select("<script>" +
            "SELECT user_id AS userId, COUNT(*) AS cnt FROM conversations WHERE user_id IN " +
            "<foreach item='id' collection='ids' open='(' separator=',' close=')'>#{id}</foreach> " +
            "GROUP BY user_id" +
            "</script>")
    List<UserCount> countConversations(@Param("ids") List<String> ids);

    @Select("<script>" +
            "SELECT user_id AS userId, COUNT(*) AS cnt FROM works WHERE user_id IN " +
            "<foreach item='id' collection='ids' open='(' separator=',' close=')'>#{id}</foreach> " +
            "GROUP BY user_id" +
            "</script>")
    List<UserCount> countWorks(@Param("ids") List<String> ids);

    @Data
    class UserCount {
        private String userId;
        private Long cnt;
    }
}
