package com.aiplatform.modules.admin.vo;

import com.aiplatform.modules.admin.entity.SystemLog;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统日志（后台展示）。
 * 用 VO 而不是直接返回实体：日志表是自增主键、字段以后可能增减，
 * 给前端一个稳定的契约更安全。
 */
@Data
public class SystemLogVO {

    private Long id;
    /** 与响应头 X-Trace-Id 一致 */
    private String traceId;
    /** ERROR / WARN / SLOW */
    private String level;
    private String method;
    private String path;
    private Integer statusCode;
    private String userId;
    private String ip;
    private Integer costMs;
    private String message;
    private LocalDateTime createdAt;

    public static SystemLogVO from(SystemLog e) {
        SystemLogVO vo = new SystemLogVO();
        vo.setId(e.getId());
        vo.setTraceId(e.getTraceId());
        vo.setLevel(e.getLevel());
        vo.setMethod(e.getMethod());
        vo.setPath(e.getPath());
        vo.setStatusCode(e.getStatusCode());
        vo.setUserId(e.getUserId());
        vo.setIp(e.getIp());
        vo.setCostMs(e.getCostMs());
        vo.setMessage(e.getMessage());
        vo.setCreatedAt(e.getCreatedAt());
        return vo;
    }
}
