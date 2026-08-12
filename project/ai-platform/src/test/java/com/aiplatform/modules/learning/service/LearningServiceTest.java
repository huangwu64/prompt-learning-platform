package com.aiplatform.modules.learning.service;

import com.aiplatform.common.BizException;
import com.aiplatform.modules.badges.service.BadgeService;
import com.aiplatform.modules.learning.entity.KnowledgePoint;
import com.aiplatform.modules.learning.entity.UserKnowledgeProgress;
import com.aiplatform.modules.learning.mapper.KnowledgePointMapper;
import com.aiplatform.modules.learning.mapper.LearningStatsMapper;
import com.aiplatform.modules.learning.mapper.UserKnowledgeProgressMapper;
import com.aiplatform.modules.learning.vo.UpdateProgressVO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 学习地图服务单元测试（知识点状态机）
 */
@ExtendWith(MockitoExtension.class)
class LearningServiceTest {

    @Mock
    private KnowledgePointMapper kpMapper;
    @Mock
    private UserKnowledgeProgressMapper progressMapper;
    @Mock
    private LearningStatsMapper statsMapper;
    @Mock
    private BadgeService badgeService;
    @InjectMocks
    private LearningService learningService;

    private KnowledgePoint kp(float threshold) {
        KnowledgePoint kp = new KnowledgePoint();
        kp.setId("topic_1");
        kp.setStage("beginner");
        kp.setName("角色设定");
        kp.setUnlockThreshold(threshold);
        return kp;
    }

    @Test
    void updateProgress_aboveThreshold_mastered() {
        when(kpMapper.selectById("topic_1")).thenReturn(kp(3.5f));
        when(progressMapper.selectOne(any())).thenReturn(null);
        when(kpMapper.selectList(any())).thenReturn(List.of());

        UpdateProgressVO vo = learningService.updateProgress("user_1", "topic_1", 4);

        assertEquals("mastered", vo.getStatus());
        assertEquals(4.0f, vo.getBestRating());
        verify(progressMapper).insert(any(UserKnowledgeProgress.class));
    }

    @Test
    void updateProgress_belowThreshold_learning() {
        when(kpMapper.selectById("topic_1")).thenReturn(kp(3.5f));
        when(progressMapper.selectOne(any())).thenReturn(null);

        UpdateProgressVO vo = learningService.updateProgress("user_1", "topic_1", 3);

        assertEquals("learning", vo.getStatus());
    }

    @Test
    void updateProgress_notFound_throws404() {
        when(kpMapper.selectById("topic_1")).thenReturn(null);

        BizException ex = assertThrows(BizException.class,
                () -> learningService.updateProgress("user_1", "topic_1", 4));

        assertEquals(404, ex.getStatus());
    }
}
