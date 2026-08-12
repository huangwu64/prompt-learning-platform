package com.aiplatform.modules.chat.mapper;

import com.aiplatform.modules.chat.entity.Conversation;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * 对话 Mapper
 */
@Mapper
public interface ConversationMapper extends BaseMapper<Conversation> {
}
