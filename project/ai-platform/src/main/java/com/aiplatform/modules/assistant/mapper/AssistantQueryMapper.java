package com.aiplatform.modules.assistant.mapper;

import lombok.Data;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 助手专用聚合查询。
 *
 * 独立于 chat 模块的 Mapper，避免为助手的统计需求去改苏格拉底的查询接口。
 * 本项目不使用 XML Mapper，聚合查询统一用 @Select 注解。
 */
@Mapper
public interface AssistantQueryMapper {

    /** 按会话批量统计消息条数（一次查询代替 N 次，避免列表接口 N+1） */
    @Select("<script>" +
            "SELECT conversation_id AS conversationId, COUNT(*) AS messageCount " +
            "FROM messages WHERE conversation_id IN " +
            "<foreach item='id' collection='ids' open='(' separator=',' close=')'>#{id}</foreach> " +
            "GROUP BY conversation_id" +
            "</script>")
    List<ConversationCount> countByConversationIds(@Param("ids") List<String> ids);

    @Data
    class ConversationCount {
        private String conversationId;
        private Long messageCount;
    }
}
