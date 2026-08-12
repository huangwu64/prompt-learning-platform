package com.aiplatform.modules.chat.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 对话消息
 */
@Data
@TableName("messages")
@IdPrefix("msg")
public class Message {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String conversationId;

    /** user / assistant */
    private String role;

    private String content;

    /** question / answer / summary */
    private String messageType;

    private LocalDateTime createdAt;
}
