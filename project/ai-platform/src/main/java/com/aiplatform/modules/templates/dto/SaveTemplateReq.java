package com.aiplatform.modules.templates.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

/**
 * 保存/更新模板请求
 */
@Data
public class SaveTemplateReq {

    @NotBlank(message = "请输入模板名称")
    @Size(max = 50, message = "模板名称长度需在 1—50 字符之间")
    private String name;

    @NotEmpty(message = "积木块不能为空")
    @Size(min = 1, max = 20, message = "积木块数量需在 1—20 之间")
    @Valid
    private List<Block> blocks;

    @Data
    public static class Block {

        @NotBlank(message = "积木类型不能为空")
        @Pattern(regexp = "role|task|context|format|constraint", message = "积木类型不合法")
        private String type;

        @NotBlank(message = "积木内容不能为空")
        @Size(max = 500, message = "积木内容长度不能超过 500 字符")
        private String content;

        @Min(value = 0, message = "积木顺序需在 0—19 之间")
        @Max(value = 19, message = "积木顺序需在 0—19 之间")
        private Integer order;
    }
}
