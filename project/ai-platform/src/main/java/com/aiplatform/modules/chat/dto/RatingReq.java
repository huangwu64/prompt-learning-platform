package com.aiplatform.modules.chat.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * 对话评分请求
 */
@Data
public class RatingReq {

    @NotNull(message = "评分不能为空")
    @Min(value = 1, message = "评分必须在 1—5 之间")
    @Max(value = 5, message = "评分必须在 1—5 之间")
    private Integer rating;
}
