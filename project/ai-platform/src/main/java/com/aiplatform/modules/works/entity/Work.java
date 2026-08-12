package com.aiplatform.modules.works.entity;

import com.aiplatform.common.annotation.IdPrefix;
import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 作品
 */
@Data
@TableName("works")
@IdPrefix("work")
public class Work {

    @TableId(type = IdType.ASSIGN_UUID)
    private String id;

    private String userId;

    /** ppt / report / email / social */
    private String workType;

    private String title;

    private String content;

    /** 表单数据（JSON 字符串，存 JSON 列） */
    private String formData;

    private String shareUrl;

    private String shareCode;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}
