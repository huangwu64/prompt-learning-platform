package com.aiplatform.common;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * 分页入参封装：page 从 1 开始，pageSize 默认 20、最大 100
 */
@Data
public class PageQuery {

    @Min(value = 1, message = "页码必须大于 0")
    private Integer page = 1;

    @Min(value = 1, message = "每页条数必须大于 0")
    @Max(value = 100, message = "每页条数不能超过 100")
    private Integer pageSize = 20;

    public long offset() {
        return (long) (page - 1) * pageSize;
    }
}
