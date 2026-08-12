package com.aiplatform.common;

import lombok.Getter;

/**
 * 业务异常：携带 HTTP 状态码与面向用户的中文提示。
 * 用法：throw new BizException(404, "对话不存在");
 */
@Getter
public class BizException extends RuntimeException {

    private final int status;

    public BizException(int status, String message) {
        super(message);
        this.status = status;
    }

    public BizException(String message) {
        this(400, message);
    }
}
