package com.aiplatform.common;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.Data;

import java.util.List;

/**
 * 分页响应结构：{items, total, page, pageSize, totalPages}
 */
@Data
public class PageResult<T> {

    private List<T> items;
    private long total;
    private long page;
    private long pageSize;
    private long totalPages;

    public static <T> PageResult<T> of(Page<?> page, List<T> items) {
        PageResult<T> result = new PageResult<>();
        result.setItems(items);
        result.setTotal(page.getTotal());
        result.setPage(page.getCurrent());
        result.setPageSize(page.getSize());
        result.setTotalPages(page.getPages());
        return result;
    }
}
