package com.aiplatform.modules.learning.service;

import com.aiplatform.common.BizException;
import com.aiplatform.modules.learning.config.LearningConfig;
import com.aiplatform.modules.learning.entity.KnowledgePoint;
import com.aiplatform.modules.learning.entity.UserKnowledgeProgress;
import com.aiplatform.modules.learning.mapper.KnowledgePointMapper;
import com.aiplatform.modules.learning.mapper.LearningStatsMapper;
import com.aiplatform.modules.learning.mapper.UserKnowledgeProgressMapper;
import com.aiplatform.modules.learning.vo.KnowledgePointVO;
import com.aiplatform.modules.learning.vo.LearningProgressVO;
import com.aiplatform.modules.learning.vo.StageVO;
import com.aiplatform.modules.learning.vo.UpdateProgressVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 学习地图：知识点状态机 + 阶段解锁 + 进度查询
 * updateProgress 为内部方法，由 chat 评分联动调用
 */
@Service
@RequiredArgsConstructor
public class LearningService {

    private static final String STATUS_LEARNING = "learning";
    private static final String STATUS_MASTERED = "mastered";

    private final KnowledgePointMapper kpMapper;
    private final UserKnowledgeProgressMapper progressMapper;
    private final LearningStatsMapper statsMapper;

    /** 启动时初始化知识点配置表（空表才插入） */
    @PostConstruct
    public void initKnowledgePoints() {
        if (kpMapper.selectCount(null) == 0) {
            LearningConfig.knowledgePoints().forEach(kpMapper::insert);
        }
    }

    // ============ 进度查询 ============

    public LearningProgressVO getProgress(String userId) {
        LearningProgressVO vo = new LearningProgressVO();

        // stats
        LearningProgressVO.Stats stats = new LearningProgressVO.Stats();
        stats.setAverageRating(statsMapper.avgRating(userId));
        stats.setStreakDays(statsMapper.streakDays(userId) != null ? statsMapper.streakDays(userId) : 0);
        stats.setTotalConversations((int) statsMapper.countConversations(userId));
        vo.setStats(stats);

        // 全量知识点 + 用户进度
        List<KnowledgePoint> all = kpMapper.selectList(new LambdaQueryWrapper<KnowledgePoint>()
                .orderByAsc(KnowledgePoint::getSortOrder));
        Map<String, UserKnowledgeProgress> progressMap = progressMapper.selectList(
                        new LambdaQueryWrapper<UserKnowledgeProgress>().eq(UserKnowledgeProgress::getUserId, userId))
                .stream().collect(Collectors.toMap(UserKnowledgeProgress::getKnowledgePointId, Function.identity()));

        // 组装四阶段
        int masteredCount = 0;
        String currentStage = null;
        for (String stage : LearningConfig.STAGE_ORDER) {
            StageVO stageVO = buildStage(stage, all, progressMap);
            masteredCount += countMastered(stageVO);
            vo.getStages().add(stageVO);
            if (!"completed".equals(stageVO.getStatus()) && currentStage == null) {
                currentStage = stage;
            }
        }
        if (currentStage == null) {
            currentStage = "master"; // 全部完成
        }
        stats.setMasteredCount(masteredCount);
        vo.setCurrentStage(currentStage);
        return vo;
    }

    private StageVO buildStage(String stage, List<KnowledgePoint> all,
                               Map<String, UserKnowledgeProgress> progressMap) {
        StageVO stageVO = new StageVO();
        stageVO.setId(stage);
        stageVO.setName(LearningConfig.STAGE_NAMES.get(stage));

        int mastered = 0;
        int total = 0;
        boolean anyProgress = false;
        for (KnowledgePoint kp : all) {
            if (!stage.equals(kp.getStage())) {
                continue;
            }
            total++;
            UserKnowledgeProgress p = progressMap.get(kp.getId());
            String status = p != null ? p.getStatus()
                    : ("beginner".equals(stage) ? STATUS_LEARNING : "locked");

            KnowledgePointVO kpVO = new KnowledgePointVO();
            kpVO.setId(kp.getId());
            kpVO.setName(kp.getName());
            kpVO.setStatus(status);
            kpVO.setBestRating(p != null ? p.getBestRating() : null);
            stageVO.getKnowledgePoints().add(kpVO);

            if (p != null) {
                anyProgress = true;
            }
            if (STATUS_MASTERED.equals(status)) {
                mastered++;
            }
        }

        if (total > 0 && mastered == total) {
            stageVO.setStatus("completed");
        } else if (anyProgress) {
            stageVO.setStatus("in_progress");
        } else {
            stageVO.setStatus("locked");
        }
        return stageVO;
    }

    private int countMastered(StageVO stage) {
        return (int) stage.getKnowledgePoints().stream()
                .filter(k -> STATUS_MASTERED.equals(k.getStatus())).count();
    }

    // ============ 进度更新（内部方法） ============

    /**
     * 更新知识点状态：评分 ≥ 阈值 → mastered；并尝试解锁下一阶段
     */
    @Transactional
    public UpdateProgressVO updateProgress(String userId, String topicId, int rating) {
        KnowledgePoint kp = kpMapper.selectById(topicId);
        if (kp == null) {
            throw new BizException(404, "知识点不存在");
        }
        UserKnowledgeProgress prev = findProgress(userId, topicId);

        String status = rating >= kp.getUnlockThreshold()
                || (prev != null && STATUS_MASTERED.equals(prev.getStatus()))
                ? STATUS_MASTERED : STATUS_LEARNING;
        float best = prev != null && prev.getBestRating() != null ? prev.getBestRating() : 0f;
        best = Math.max(best, rating);

        UserKnowledgeProgress p = prev != null ? prev : new UserKnowledgeProgress();
        p.setUserId(userId);
        p.setKnowledgePointId(topicId);
        p.setStatus(status);
        p.setBestRating(best);
        if (prev == null) {
            progressMapper.insert(p);
        } else {
            progressMapper.updateById(p);
        }

        boolean stageUnlocked = false;
        if (STATUS_MASTERED.equals(status)
                && (prev == null || !STATUS_MASTERED.equals(prev.getStatus()))) {
            stageUnlocked = maybeUnlockNextStage(userId, kp.getStage());
        }

        UpdateProgressVO vo = new UpdateProgressVO();
        vo.setStatus(status);
        vo.setBestRating(best);
        vo.setStageUnlocked(stageUnlocked);
        return vo;
    }

    /**
     * 当前阶段全部掌握 → 解锁下一阶段（写入 learning 状态）
     */
    private boolean maybeUnlockNextStage(String userId, String stage) {
        int idx = indexOf(stage);
        if (idx < 0 || idx >= LearningConfig.STAGE_ORDER.length - 1) {
            return false;
        }
        List<KnowledgePoint> currentKps = kpMapper.selectList(
                new LambdaQueryWrapper<KnowledgePoint>().eq(KnowledgePoint::getStage, stage));
        for (KnowledgePoint kp : currentKps) {
            UserKnowledgeProgress p = findProgress(userId, kp.getId());
            if (p == null || !STATUS_MASTERED.equals(p.getStatus())) {
                return false;
            }
        }
        // 解锁下一阶段
        String nextStage = LearningConfig.STAGE_ORDER[idx + 1];
        List<KnowledgePoint> nextKps = kpMapper.selectList(
                new LambdaQueryWrapper<KnowledgePoint>().eq(KnowledgePoint::getStage, nextStage));
        for (KnowledgePoint kp : nextKps) {
            if (findProgress(userId, kp.getId()) == null) {
                UserKnowledgeProgress np = new UserKnowledgeProgress();
                np.setUserId(userId);
                np.setKnowledgePointId(kp.getId());
                np.setStatus(STATUS_LEARNING);
                np.setBestRating(0f);
                progressMapper.insert(np);
            }
        }
        return true;
    }

    private UserKnowledgeProgress findProgress(String userId, String kpId) {
        return progressMapper.selectOne(new LambdaQueryWrapper<UserKnowledgeProgress>()
                .eq(UserKnowledgeProgress::getUserId, userId)
                .eq(UserKnowledgeProgress::getKnowledgePointId, kpId));
    }

    private int indexOf(String stage) {
        for (int i = 0; i < LearningConfig.STAGE_ORDER.length; i++) {
            if (LearningConfig.STAGE_ORDER[i].equals(stage)) {
                return i;
            }
        }
        return -1;
    }
}
