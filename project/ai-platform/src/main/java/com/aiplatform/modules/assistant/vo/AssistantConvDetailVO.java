package com.aiplatform.modules.assistant.vo;

import com.aiplatform.modules.chat.vo.MessageVO;
import lombok.Data;

import java.util.List;

/**
 * 助手会话详情
 *
 * 注意 conversations 字段只带助手需要的部分：会话 id 与标题（不复用 ConversationVO，
 * 因为后者大部分字段是苏格拉底专属、对助手恒为 null）。
 */
@Data
public class AssistantConvDetailVO {

    private String id;
    private String title;
    private List<MessageVO> messages;

    public AssistantConvDetailVO(String id, String title, List<MessageVO> messages) {
        this.id = id;
        this.title = title;
        this.messages = messages;
    }
}
