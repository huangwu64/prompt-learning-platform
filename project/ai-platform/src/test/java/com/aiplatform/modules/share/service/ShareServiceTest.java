package com.aiplatform.modules.share.service;

import com.aiplatform.common.BizException;
import com.aiplatform.modules.share.mapper.ShareUserMapper;
import com.aiplatform.modules.share.vo.PublicWorkVO;
import com.aiplatform.modules.share.vo.ShareVO;
import com.aiplatform.modules.works.entity.Work;
import com.aiplatform.modules.works.mapper.WorkMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 作品分享服务单元测试
 */
@ExtendWith(MockitoExtension.class)
class ShareServiceTest {

    @Mock
    private WorkMapper workMapper;
    @Mock
    private ShareUserMapper shareUserMapper;
    @InjectMocks
    private ShareService shareService;

    @Test
    void generate_createsCode() {
        Work work = new Work();
        work.setId("work_1");
        work.setUserId("user_1");
        when(workMapper.selectById("work_1")).thenReturn(work);
        when(workMapper.selectCount(any())).thenReturn(0L);

        ShareVO vo = shareService.generate("user_1", "work_1");

        assertNotNull(vo.getShareCode());
        assertTrue(vo.getShareUrl().contains(vo.getShareCode()));
        verify(workMapper).updateById(any(Work.class));
    }

    @Test
    void getPublic_notFound_throws404() {
        when(workMapper.selectOne(any())).thenReturn(null);

        BizException ex = assertThrows(BizException.class, () -> shareService.getPublic("abc"));

        assertEquals(404, ex.getStatus());
    }

    @Test
    void getPublic_returnsMaskedData() {
        Work work = new Work();
        work.setId("work_1");
        work.setUserId("user_1");
        work.setWorkType("email");
        work.setTitle("季度汇报");
        work.setContent("内容");
        when(workMapper.selectOne(any())).thenReturn(work);
        when(shareUserMapper.username("user_1")).thenReturn("测试用户");

        PublicWorkVO vo = shareService.getPublic("abc");

        assertEquals("测试用户", vo.getAuthor());
        assertEquals("内容", vo.getContent());
        assertEquals("季度汇报", vo.getTitle());
    }
}
