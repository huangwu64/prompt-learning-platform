import apiClient from "./apiClient";
import type { PaginationParams, PaginatedData } from "@/types";
import type {
  CreateChatRequest,
  SendMessageRequest,
  ConversationHistoryItem,
  CreateChatResponse,
  ChatDetailResponse,
  SendMessageResponse,
  CompleteChatResponse,
  RateChatResponse,
} from "@/types";

export const chatService = {
  /** 创建对话 POST /api/chat */
  create: (data: CreateChatRequest) =>
    apiClient.post<CreateChatResponse>("/chat", data),

  /** 对话历史列表 GET /api/chat/history */
  getHistory: (params?: PaginationParams & { status?: "active" | "completed" }) =>
    apiClient.get<PaginatedData<ConversationHistoryItem>>("/chat/history", { params }),

  /** 对话详情（含所有消息） GET /api/chat/:id */
  getDetail: (id: string) =>
    apiClient.get<ChatDetailResponse>(`/chat/${id}`),

  /** 用户回复消息 POST /api/chat/:id/message */
  sendMessage: (id: string, data: SendMessageRequest) =>
    apiClient.post<SendMessageResponse>(`/chat/${id}/message`, data),

  /** 完成对话 POST /api/chat/:id/complete */
  complete: (id: string) =>
    apiClient.post<CompleteChatResponse>(`/chat/${id}/complete`),

  /** 对话评分 POST /api/chat/:id/rating */
  rate: (id: string, rating: number) =>
    apiClient.post<RateChatResponse>(`/chat/${id}/rating`, { rating }),
};
