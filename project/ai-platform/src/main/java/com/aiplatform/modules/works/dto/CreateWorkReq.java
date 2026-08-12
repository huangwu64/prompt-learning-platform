package com.aiplatform.modules.works.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.Map;

/**
 * 生成作品请求（formData 结构按 workType 动态校验）
 */
@Data
public class CreateWorkReq {

    @NotBlank(message = "作品类型不能为空")
    @Pattern(regexp = "ppt|report|email|social", message = "作品类型不合法")
    private String workType;

    @NotBlank(message = "标题不能为空")
    @Size(max = 100, message = "标题长度不能超过 100 字符")
    private String title;

    @NotNull(message = "表单数据不能为空")
    private Map<String, Object> formData;
}
