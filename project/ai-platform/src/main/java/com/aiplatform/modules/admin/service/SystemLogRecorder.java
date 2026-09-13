package com.aiplatform.modules.admin.service;

import com.aiplatform.modules.admin.entity.SystemLog;
import com.aiplatform.modules.admin.mapper.SystemLogMapper;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * 系统日志落库。
 *
 * 由 RequestLogFilter 在请求收尾时调用 —— 那里是**同步路径**，
 * 所以只入队，写库交给后台线程。
 */
@Component
public class SystemLogRecorder extends QueuedRecorder<SystemLog> {

    private static final int QUEUE_CAPACITY = 1000;

    private final SystemLogMapper systemLogMapper;

    public SystemLogRecorder(SystemLogMapper systemLogMapper) {
        super("system-log-recorder", QUEUE_CAPACITY);
        this.systemLogMapper = systemLogMapper;
    }

    public void record(String traceId, String level, String method, String path,
                       int statusCode, String userId, String ip, int costMs, String message) {
        SystemLog row = new SystemLog();
        row.setTraceId(traceId);
        row.setLevel(level);
        row.setMethod(method);
        // 超长路径/消息截断，避免插入失败（列宽 300 / 1000）
        row.setPath(truncate(path, 300));
        row.setStatusCode(statusCode);
        row.setUserId(userId);
        row.setIp(ip);
        row.setCostMs(costMs);
        row.setMessage(truncate(message, 1000));
        row.setCreatedAt(LocalDateTime.now());
        enqueue(row);
    }

    @Override
    protected void persist(SystemLog row) {
        systemLogMapper.insert(row);
    }

    @Override
    protected String describe(SystemLog row) {
        return "系统日志(" + row.getLevel() + " " + row.getPath() + ")";
    }

    private String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
