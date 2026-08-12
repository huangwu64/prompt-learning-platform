package com.aiplatform.modules.works.service;

import com.aiplatform.ai.AiGateway;
import com.aiplatform.common.BizException;
import com.aiplatform.modules.badges.service.BadgeService;
import com.aiplatform.modules.works.dto.CreateWorkReq;
import com.aiplatform.modules.works.entity.Work;
import com.aiplatform.modules.works.mapper.WorkMapper;
import com.aiplatform.modules.works.vo.WorkVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 作品工厂服务单元测试
 */
@ExtendWith(MockitoExtension.class)
class WorksServiceTest {

    @Mock
    private WorkMapper workMapper;
    @Mock
    private AiGateway aiGateway;
    @Mock
    private BadgeService badgeService;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks
    private WorksService worksService;

    private CreateWorkReq emailReq() {
        CreateWorkReq req = new CreateWorkReq();
        req.setWorkType("email");
        req.setTitle("季度汇报");
        req.setFormData(Map.of(
                "recipient", "张总",
                "purpose", "汇报季度进展",
                "tone", "正式",
                "attachment", "数据表.xlsx"));
        return req;
    }

    @Test
    void create_email_success() {
        when(aiGateway.chatText(any(), anyList(), any())).thenReturn("尊敬的张总：...");
        when(workMapper.selectCount(any())).thenReturn(0L);

        WorkVO vo = worksService.create("user_1", emailReq());

        assertEquals("尊敬的张总：...", vo.getContent());
        verify(workMapper).insert(any(Work.class));
    }

    @Test
    void create_missingField_throws400() {
        CreateWorkReq req = emailReq();
        req.setFormData(Map.of("recipient", "张总")); // 缺 purpose/tone/attachment

        BizException ex = assertThrows(BizException.class, () -> worksService.create("user_1", req));

        assertEquals(400, ex.getStatus());
    }

    @Test
    void delete_notOwned_throws403() {
        Work work = new Work();
        work.setId("work_1");
        work.setUserId("other_user");
        when(workMapper.selectById("work_1")).thenReturn(work);

        BizException ex = assertThrows(BizException.class, () -> worksService.delete("user_1", "work_1"));

        assertEquals(403, ex.getStatus());
    }
}
