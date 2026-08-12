package com.aiplatform.modules.templates.service;

import com.aiplatform.common.BizException;
import com.aiplatform.modules.templates.dto.SaveTemplateReq;
import com.aiplatform.modules.templates.entity.Template;
import com.aiplatform.modules.templates.mapper.TemplateMapper;
import com.aiplatform.modules.templates.vo.TemplateVO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 积木模板服务单元测试
 */
@ExtendWith(MockitoExtension.class)
class TemplateServiceTest {

    @Mock
    private TemplateMapper templateMapper;
    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();
    @InjectMocks
    private TemplateService templateService;

    private SaveTemplateReq req() {
        SaveTemplateReq req = new SaveTemplateReq();
        req.setName("AI科普文章");
        SaveTemplateReq.Block block = new SaveTemplateReq.Block();
        block.setType("role");
        block.setContent("你是一位资深编辑");
        block.setOrder(0);
        req.setBlocks(List.of(block));
        return req;
    }

    @Test
    void save_success() {
        when(templateMapper.selectCount(any())).thenReturn(0L);

        TemplateVO vo = templateService.save("user_1", req());

        assertEquals("AI科普文章", vo.getName());
        verify(templateMapper).insert(any(Template.class));
    }

    @Test
    void save_duplicateName_throws400() {
        when(templateMapper.selectCount(any())).thenReturn(1L);

        BizException ex = assertThrows(BizException.class, () -> templateService.save("user_1", req()));

        assertEquals(400, ex.getStatus());
    }

    @Test
    void delete_notOwned_throws403() {
        Template t = new Template();
        t.setId("tpl_1");
        t.setUserId("other_user");
        when(templateMapper.selectById("tpl_1")).thenReturn(t);

        BizException ex = assertThrows(BizException.class, () -> templateService.delete("user_1", "tpl_1"));

        assertEquals(403, ex.getStatus());
    }
}
