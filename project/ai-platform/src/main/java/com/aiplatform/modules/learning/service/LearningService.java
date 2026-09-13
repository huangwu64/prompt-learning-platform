package com.aiplatform.modules.learning.service;

import com.aiplatform.common.BizException;
import com.aiplatform.modules.badges.service.BadgeService;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * 学习地图：知识点状态机 + 阶段解锁 + 进度查询
 * updateProgress 为内部方法，由 chat 评分联动调用
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LearningService {

    private static final String STATUS_LEARNING = "learning";
    private static final String STATUS_MASTERED = "mastered";

    /** 能力雷达取最近多少次对话做平均：越新越能代表当前水平 */
    private static final int RADAR_SAMPLE_SIZE = 20;

    private final KnowledgePointMapper kpMapper;
    private final UserKnowledgeProgressMapper progressMapper;
    private final LearningStatsMapper statsMapper;
    private final BadgeService badgeService;
    private final ObjectMapper objectMapper;

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
        // 平均分取**系统综合评分**，不是用户满意度星级
        stats.setAverageScore(statsMapper.avgScore(userId));
        stats.setStreakDays(statsMapper.streakDays(userId) != null ? statsMapper.streakDays(userId) : 0);
        stats.setTotalConversations((int) statsMapper.countConversations(userId));
        vo.setStats(stats);
        vo.setRadar(buildRadar(userId));

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
            kpVO.setBestScore(p != null ? p.getBestRating() : null);
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

    /**
     * 能力雷达：把最近若干次对话的五要素分数取平均。
     *
     * 要素的 key/label 直接从落库的 JSON 里取，不在这里重复声明一份，
     * 避免与 PromptScorer 的定义分叉。顺序沿用首次出现的顺序（即 PromptScorer 的固有顺序）。
     */
    private List<LearningProgressVO.RadarDimension> buildRadar(String userId) {
        List<String> rawList = statsMapper.recentElementScores(userId, RADAR_SAMPLE_SIZE);

        // key -> [累计分, 出现次数, 标签]
        Map<String, double[]> acc = new LinkedHashMap<>();
        Map<String, String> labels = new LinkedHashMap<>();

        for (String raw : rawList) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            try {
                JsonNode arr = objectMapper.readTree(raw);
                if (!arr.isArray()) {
                    continue;
                }
                for (JsonNode el : arr) {
                    String key = el.path("key").asText(null);
                    if (key == null || key.isBlank()) {
                        continue;
                    }
                    acc.computeIfAbsent(key, k -> new double[2]);
                    acc.get(key)[0] += el.path("score").asDouble(0);
                    acc.get(key)[1] += 1;
                    labels.putIfAbsent(key, el.path("label").asText(key));
                }
            } catch (Exception e) {
                log.warn("解析对话五要素分数失败，已跳过: {}", e.getMessage());
            }
        }

        List<LearningProgressVO.RadarDimension> radar = new ArrayList<>();
        acc.forEach((key, pair) -> {
            LearningProgressVO.RadarDimension dim = new LearningProgressVO.RadarDimension();
            dim.setKey(key);
            dim.setLabel(labels.getOrDefault(key, key));
            // 单要素原始分是 0-20，换算到 0-100 以便与雷达图其它口径统一
            double avgRaw = pair[1] > 0 ? pair[0] / pair[1] : 0;
            dim.setScore(Math.round(avgRaw * 5 * 10) / 10.0);
            radar.add(dim);
        });
        return radar;
    }

    // ============ 进度更新（内部方法） ============

    /**
     * 打卡：完成任意一次对话即算当天打卡。
     *
     * 昨天打过 → 连续 +1；否则重置为 1。今天已打过则不变。
     * 用「日期是否相邻」判断而非累加计数，跨天/漏打都不会算错。
     */
    @Transactional
    public void checkIn(String userId) {
        LocalDate today = LocalDate.now();
        LocalDate last = statsMapper.lastCheckinDate(userId);
        if (today.equals(last)) {
            return;
        }
        Integer current = statsMapper.streakDays(userId);
        int streak = (last != null && last.plusDays(1).equals(today))
                ? (current == null ? 1 : current + 1)
                : 1;
        statsMapper.updateCheckin(userId, streak, today);
        log.info("打卡成功 userId={} 连续天数={}", userId, streak);
    }

    /**
     * 更新知识点状态：**系统综合评分** ≥ 阈值 → mastered；并尝试解锁下一阶段。
     *
     * 注意 score 的口径是 0-100（完整度 70% + 轮数 30%），不再是用户满意度星级。
     * 阈值也存在 knowledge_points.unlock_threshold 里，同为 0-100。
     */
    @Transactional
    public UpdateProgressVO updateProgress(String userId, String topicId, int score) {
        KnowledgePoint kp = kpMapper.selectById(topicId);
        if (kp == null) {
            throw new BizException(404, "知识点不存在");
        }
        UserKnowledgeProgress prev = findProgress(userId, topicId);

        String status = score >= kp.getUnlockThreshold()
                || (prev != null && STATUS_MASTERED.equals(prev.getStatus()))
                ? STATUS_MASTERED : STATUS_LEARNING;
        // 实体字段仍叫 bestRating（映射列 best_rating），但存的已是 0-100 的综合评分
        float best = prev != null && prev.getBestRating() != null ? prev.getBestRating() : 0f;
        best = Math.max(best, score);

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

        // 徽章触发：阶段解锁（入门完成等）
        if (stageUnlocked) {
            badgeService.checkAndUnlock(userId, "stage_complete", 1);
        }
        log.info("学习进度更新 userId={} topicId={} status={}", userId, topicId, status);

        UpdateProgressVO vo = new UpdateProgressVO();
        vo.setStatus(status);
        vo.setBestScore(best);
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
