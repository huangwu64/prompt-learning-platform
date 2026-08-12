package com.aiplatform.modules.badges.service;

import com.aiplatform.modules.badges.config.BadgeConfig;
import com.aiplatform.modules.badges.entity.Badge;
import com.aiplatform.modules.badges.entity.UserBadge;
import com.aiplatform.modules.badges.mapper.BadgeMapper;
import com.aiplatform.modules.badges.mapper.UserBadgeMapper;
import com.aiplatform.modules.badges.vo.BadgeVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 徽章：解锁引擎 + 定义列表
 * checkAndUnlock 为内部方法，由 chat/works/learning 埋点调用
 */
@Service
@RequiredArgsConstructor
public class BadgeService {

    private final BadgeMapper badgeMapper;
    private final UserBadgeMapper userBadgeMapper;
    private final ObjectMapper objectMapper;

    /** 启动时初始化徽章定义（空表才插入） */
    @PostConstruct
    public void initBadges() {
        if (badgeMapper.selectCount(null) == 0) {
            BadgeConfig.badges().forEach(badgeMapper::insert);
        }
    }

    /** 全部徽章定义 + 当前用户解锁状态 */
    public List<BadgeVO> list(String userId) {
        List<Badge> all = badgeMapper.selectList(null);
        List<UserBadge> mine = userBadgeMapper.selectList(
                new LambdaQueryWrapper<UserBadge>().eq(UserBadge::getUserId, userId));
        Map<String, LocalDateTime> unlockedMap = mine.stream()
                .collect(Collectors.toMap(UserBadge::getBadgeId, UserBadge::getUnlockedAt, (a, b) -> a));
        return all.stream()
                .map(b -> BadgeVO.from(b, unlockedMap.get(b.getId()), objectMapper))
                .toList();
    }

    /**
     * 解锁引擎：达到条件的徽章写入 user_badges
     *
     * @param type  徽章条件类型（streak/conversation_count/first_rating/stage_complete/works_count）
     * @param value 当前达标值
     */
    @Transactional
    public void checkAndUnlock(String userId, String type, int value) {
        List<Badge> candidates = badgeMapper.selectList(null);
        Set<String> owned = userBadgeMapper.selectList(
                        new LambdaQueryWrapper<UserBadge>().eq(UserBadge::getUserId, userId))
                .stream().map(UserBadge::getBadgeId).collect(Collectors.toSet());

        for (Badge b : candidates) {
            if (owned.contains(b.getId())) {
                continue;
            }
            JsonNode criteria = parse(b.getUnlockCriteria());
            if (criteria == null || !type.equals(criteria.path("type").asText())) {
                continue;
            }
            if (value >= criteria.path("target").asInt(0)) {
                UserBadge ub = new UserBadge();
                ub.setUserId(userId);
                ub.setBadgeId(b.getId());
                userBadgeMapper.insert(ub);
            }
        }
    }

    private JsonNode parse(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readTree(json);
        } catch (Exception e) {
            return null;
        }
    }
}
