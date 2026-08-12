package com.aiplatform.modules.chat.controller;

import com.aiplatform.common.PageQuery;
import com.aiplatform.common.PageResult;
import com.aiplatform.common.Result;
import com.aiplatform.common.util.SecurityUtil;
import com.aiplatform.modules.chat.dto.CreateChatReq;
import com.aiplatform.modules.chat.dto.RatingReq;
import com.aiplatform.modules.chat.dto.ReplyReq;
import com.aiplatform.modules.chat.service.ChatService;
import com.aiplatform.modules.chat.vo.ChatCreateVO;
import com.aiplatform.modules.chat.vo.ChatDetailVO;
import com.aiplatform.modules.chat.vo.ChatTurnVO;
import com.aiplatform.modules.chat.vo.CompleteVO;
import com.aiplatform.modules.chat.vo.ConversationVO;
import com.aiplatform.modules.chat.vo.RatingVO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 苏格拉底对话接口
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    /** 创建对话，返回第一轮追问 */
    @PostMapping
    public Result<ChatCreateVO> create(@Valid @RequestBody CreateChatReq req) {
        return Result.ok(chatService.create(SecurityUtil.currentUserId(), req));
    }

    /** 对话历史列表 */
    @GetMapping("/history")
    public Result<PageResult<ConversationVO>> history(@Valid PageQuery pageQuery,
                                                      @RequestParam(required = false) String status) {
        return Result.ok(chatService.history(SecurityUtil.currentUserId(), pageQuery, status));
    }

    /** 对话详情 */
    @GetMapping("/{id}")
    public Result<ChatDetailVO> detail(@PathVariable String id) {
        return Result.ok(chatService.detail(SecurityUtil.currentUserId(), id));
    }

    /** 回复消息（AI 继续追问或完成） */
    @PostMapping("/{id}/message")
    public Result<ChatTurnVO> reply(@PathVariable String id, @Valid @RequestBody ReplyReq req) {
        return Result.ok(chatService.reply(SecurityUtil.currentUserId(), id, req.getContent()));
    }

    /** 完成对话，生成优化结果 */
    @PostMapping("/{id}/complete")
    public Result<CompleteVO> complete(@PathVariable String id) {
        return Result.ok(chatService.complete(SecurityUtil.currentUserId(), id));
    }

    /** 对话评分，联动学习进度 */
    @PostMapping("/{id}/rating")
    public Result<RatingVO> rating(@PathVariable String id, @Valid @RequestBody RatingReq req) {
        return Result.ok(chatService.rating(SecurityUtil.currentUserId(), id, req.getRating()));
    }
}
