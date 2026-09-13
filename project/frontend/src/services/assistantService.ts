import apiClient from "./apiClient";
import type {
  AssistantConversation,
  AssistantConversationDetail,
  Message,
  PaginatedData,
  PaginationParams,
} from "@/types";

/**
 * 全局 AI 助手接口。
 *
 * 注意：流式发消息**不在这里** —— 它走 `lib/sseClient.ts`（axios 无法承载 SSE）。
 * 本文件只覆盖普通 JSON 接口。
 */
export const assistantService = {
  /** 新建会话 POST /api/assistant/conversations */
  create: (title?: string) =>
    apiClient.post<AssistantConversationDetail>("/assistant/conversations", { title }),

  /** 历史会话列表 GET /api/assistant/conversations */
  list: (params?: PaginationParams) =>
    apiClient.get<PaginatedData<AssistantConversation>>("/assistant/conversations", { params }),

  /** 会话详情 GET /api/assistant/conversations/:id */
  detail: (id: string) =>
    apiClient.get<AssistantConversationDetail>(`/assistant/conversations/${id}`),

  /** 删除会话 DELETE /api/assistant/conversations/:id（前端暂不暴露入口） */
  remove: (id: string) => apiClient.delete<null>(`/assistant/conversations/${id}`),

  /** 非流式发消息 POST /api/assistant/chat（流式的降级方案） */
  chat: (conversationId: string, content: string) =>
    apiClient.post<Message>("/assistant/chat", { conversationId, content }),
};

export default assistantService;
