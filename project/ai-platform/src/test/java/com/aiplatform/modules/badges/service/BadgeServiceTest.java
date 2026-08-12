package com.aiplatform.modules.badges.service;

import com.aiplatform.modules.badges.entity.Badge;
import com.aiplatform.modules.badges.entity.UserBadge;
import com.aiplatform.modules.badges.mapper.BadgeMapper;
import com.aiplatform.modules.badges.mapper.UserBadgeMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 徽章解锁引擎单元测试
 */
@ExtendWith(MockitoExtension.class)
class BadgeServiceTest {

    @Mock
    private BadgeMapper badgeMapper;
    @Mock
    private UserBadgeMapper userBadgeMapper;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks
    private BadgeService badgeService;

    private Badge badge(String type, int target) {
        Badge b = new Badge();
        b.setId("badge_" + type);
        b.setUnlockCriteria("{\"type\":\"" + type + "\",\"target\":" + target + "}");
        return b;
    }

    @Test
    void checkAndUnlock_meetsTarget_unlocks() {
        when(badgeMapper.selectList(any())).thenReturn(List.of(badge("streak", 7)));
        when(userBadgeMapper.selectList(any())).thenReturn(List.of());

        badgeService.checkAndUnlock("user_1", "streak", 10);

        verify(userBadgeMapper).insert(any(UserBadge.class));
    }

    @Test
    void checkAndUnlock_belowTarget_skip() {
        when(badgeMapper.selectList(any())).thenReturn(List.of(badge("streak", 7)));
        when(userBadgeMapper.selectList(any())).thenReturn(List.of());

        badgeService.checkAndUnlock("user_1", "streak", 3);

        verify(userBadgeMapper, never()).insert(any(UserBadge.class));
    }

    @Test
    void checkAndUnlock_alreadyOwned_skip() {
        when(badgeMapper.selectList(any())).thenReturn(List.of(badge("streak", 7)));
        UserBadge owned = new UserBadge();
        owned.setBadgeId("badge_streak");
        when(userBadgeMapper.selectList(any())).thenReturn(List.of(owned));

        badgeService.checkAndUnlock("user_1", "streak", 10);

        verify(userBadgeMapper, never()).insert(any(UserBadge.class));
    }
}
