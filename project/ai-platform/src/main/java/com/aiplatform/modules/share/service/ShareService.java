package com.aiplatform.modules.share.service;

import com.aiplatform.common.BizException;
import com.aiplatform.modules.share.mapper.ShareUserMapper;
import com.aiplatform.modules.share.vo.PublicWorkVO;
import com.aiplatform.modules.share.vo.ShareVO;
import com.aiplatform.modules.works.entity.Work;
import com.aiplatform.modules.works.mapper.WorkMapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

/**
 * 作品分享：生成/取消分享码、公开读取（脱敏）
 */
@Service
@RequiredArgsConstructor
public class ShareService {

    private static final String SHARE_BASE_URL = "http://localhost:8080/api/share/";
    private static final String CODE_CHARS =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    private final WorkMapper workMapper;
    private final ShareUserMapper shareUserMapper;

    /** 生成分享链接（已分享则复用） */
    public ShareVO generate(String userId, String workId) {
        Work work = requireOwned(userId, workId);
        if (work.getShareCode() == null || work.getShareCode().isBlank()) {
            String code = uniqueCode();
            work.setShareCode(code);
            work.setShareUrl(SHARE_BASE_URL + code);
            workMapper.updateById(work);
        }
        ShareVO vo = new ShareVO();
        vo.setId(work.getId());
        vo.setShareCode(work.getShareCode());
        vo.setShareUrl(work.getShareUrl());
        return vo;
    }

    /** 取消分享 */
    public Map<String, Object> cancel(String userId, String workId) {
        Work work = requireOwned(userId, workId);
        work.setShareCode(null);
        work.setShareUrl(null);
        workMapper.updateById(work);

        Map<String, Object> result = new HashMap<>();
        result.put("id", work.getId());
        result.put("shareCode", null);
        result.put("shareUrl", null);
        return result;
    }

    /** 公开读取分享作品（免鉴权，脱敏） */
    public PublicWorkVO getPublic(String code) {
        Work work = workMapper.selectOne(new LambdaQueryWrapper<Work>()
                .eq(Work::getShareCode, code));
        if (work == null) {
            throw new BizException(404, "分享链接不存在或已取消");
        }
        PublicWorkVO vo = new PublicWorkVO();
        vo.setId(work.getId());
        vo.setWorkType(work.getWorkType());
        vo.setTitle(work.getTitle());
        vo.setContent(work.getContent());
        vo.setAuthor(shareUserMapper.username(work.getUserId()));
        vo.setCreatedAt(work.getCreatedAt());
        return vo;
    }

    // ============ 私有 ============

    private Work requireOwned(String userId, String id) {
        Work work = workMapper.selectById(id);
        if (work == null) {
            throw new BizException(404, "作品不存在");
        }
        if (!userId.equals(work.getUserId())) {
            throw new BizException(403, "无权操作该作品");
        }
        return work;
    }

    /** 生成 6 位随机分享码，冲突时重试 */
    private String uniqueCode() {
        Random random = new Random();
        for (int i = 0; i < 5; i++) {
            StringBuilder sb = new StringBuilder(6);
            for (int j = 0; j < 6; j++) {
                sb.append(CODE_CHARS.charAt(random.nextInt(CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (workMapper.selectCount(new LambdaQueryWrapper<Work>()
                    .eq(Work::getShareCode, code)) == 0) {
                return code;
            }
        }
        throw new BizException(500, "分享码生成失败，请重试");
    }
}
