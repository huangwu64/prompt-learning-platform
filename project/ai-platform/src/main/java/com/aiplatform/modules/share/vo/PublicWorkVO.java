package com.aiplatform.modules.share.vo;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 公开分享作品（脱敏，不含 userId/email 等）
 */
@Data
public class PublicWorkVO {

    private String id;
    private String workType;
    private String title;
    private String content;
    private String author;
    private LocalDateTime createdAt;
}
