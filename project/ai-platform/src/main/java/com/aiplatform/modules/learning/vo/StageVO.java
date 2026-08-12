package com.aiplatform.modules.learning.vo;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

/**
 * 阶段技能树节点（对外）
 */
@Data
public class StageVO {

    /** beginner / intermediate / advanced / master */
    private String id;
    private String name;
    /** completed / in_progress / locked */
    private String status;
    private List<KnowledgePointVO> knowledgePoints = new ArrayList<>();
}
