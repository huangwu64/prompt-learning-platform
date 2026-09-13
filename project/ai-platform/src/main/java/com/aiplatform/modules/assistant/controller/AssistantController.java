package com.aiplatform.modules.assistant.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.config.RateLimit;
import com.aiplatform.modules.assistant.dto.AssistantChatReq;
import com.aiplatform.modules.assistant.dto.CreateAssistantConvReq;
import com.aiplatform.modules.assistant.service.AssistantService;
import com.aiplatform.modules.assistant.vo.AssistantConvDetailVO;
import com.aiplatform.modules.assistant.vo.AssistantConversationVO;
import com.aiplatform.modules.chat.vo.MessageVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * 全局 AI 助手接口。
 *
 * 全部需要登录（助手不给游客用）。SSE 接口是本项目**唯一不使用 Result&lt;T&gt; 信封**的
 * 响应 —— 它按 text/event-stream 下发 meta/delta/done/error 事件，详见 AssistantService。
 */
@RestController
@RequestMapping("/api/assistant")
@RequiredArgsConstructor
public class AssistantController {

    private final AssistantService assistantService;

    /** 新建会话（可不带 body） */
    @PostMapping("/conversations")
    public Result<AssistantConvDetailVO> create(@Valid @RequestBody(required = false) CreateAssistantConvReq req) {
        CreateAssistantConvReq safeReq = req != null ? req : new CreateAssistantConvReq();
        return Result.ok(assistantService.create(SecurityUtil.currentUserId(), safeReq));
    }

    /** 历史会话列表 */
    @GetMapping("/conversations")
    public Result<PageResult<AssistantConversationVO>> list(@Valid PageQuery pageQuery) {
        return Result.ok(assistantService.list(SecurityUtil.currentUserId(), pageQuery));
    }

    /** 会话详情（回看用） */
    @GetMapping("/conversations/{id}")
    public Result<AssistantConvDetailVO> detail(@PathVariable String id) {
        return Result.ok(assistantService.detail(SecurityUtil.currentUserId(), id));
    }

    /** 删除会话（前端不暴露按钮，留给后台审计/清理用） */
    @DeleteMapping("/conversations/{id}")
    public Result<Void> delete(@PathVariable String id) {
        assistantService.delete(SecurityUtil.currentUserId(), id);
        return Result.ok();
    }

    /** 非流式发消息：供 e2e 测试与流式降级使用 */
    @PostMapping("/chat")
    @RateLimit(type = "user", limit = 20, windowSeconds = 60)
    public Result<MessageVO> chat(@Valid @RequestBody AssistantChatReq req) {
        return Result.ok(assistantService.chat(SecurityUtil.currentUserId(), req));
    }

    /**
     * 流式发消息（SSE）。
     *
     * userId 必须在**请求线程**里取 —— SecurityContextHolder 是 ThreadLocal，
     * Service 内部把它捕获后传给线程池，线程池里再取就是 null 了。
     */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @RateLimit(type = "user", limit = 20, windowSeconds = 60)
    public SseEmitter stream(@Valid @RequestBody AssistantChatReq req) {
        return assistantService.stream(SecurityUtil.currentUserId(), req);
    }
}
