package com.aiplatform.modules.share.vo;

import lombok.Data;

/**
 * 分享链接响应
 */
@Data
public class ShareVO {

    private String id;
    private String shareCode;
    private String shareUrl;
}
