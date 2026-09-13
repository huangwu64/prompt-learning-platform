package com.aiplatform.modules.admin.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 系统日志（只记错误与慢请求）。
 *
 * 全量请求入库会把数据库写成热点，所以 RequestLogFilter 只挑
 * status >= 400 或耗时 >= 1000ms 的写入。
 */
@Data
@TableName("system_logs")
public class SystemLog {

    @TableId(type = IdType.AUTO)
    private Long id;

    /** 与响应头 X-Trace-Id 一致，可把同一次请求的日志串起来 */
    private String traceId;

    /** ERROR（5xx）/ WARN（4xx）/ SLOW（慢但成功） */
    private String level;

    private String method;

    private String path;

    private Integer statusCode;

    private String userId;

    private String ip;

    private Integer costMs;

    private String message;

    private LocalDateTime createdAt;
}
