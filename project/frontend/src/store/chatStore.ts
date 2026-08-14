import { create } from "zustand";
import { chatService } from "@/services/chatService";
import type { Conversation, Message } from "@/types";

interface ChatState {
  conversation: Conversation | null;
  messages: Message[];
  sending: boolean;
  error: string | null;
  rated: boolean;
  createChat: (prompt: string, topicId?: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  completeChat: () => Promise<void>;
  rateChat: (rating: number) => Promise<void>;
  reset: () => void;
}

/** 本地临时消息（尚未获得后端 id） */
function localMessage(content: string, role: "user" | "assistant"): Message {
  return {
    id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    role,
    content,
    messageType: role === "user" ? "answer" : "question",
    createdAt: new Date().toISOString(),
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversation: null,
  messages: [],
  sending: false,
  error: null,
  rated: false,

  /** 创建对话 POST /api/chat */
  createChat: async (prompt, topicId) => {
    set({ sending: true, error: null });
    try {
      const data = await chatService.create({ originalPrompt: prompt, topicId });
      set({
        conversation: data.conversation,
        messages: [data.message],
        sending: false,
        rated: false,
      });
    } catch (err) {
      set({ sending: false, error: err instanceof Error ? err.message : "创建对话失败" });
      throw err;
    }
  },

  /** 用户回复 POST /api/chat/:id/message */
  sendMessage: async (content) => {
    const { conversation } = get();
    if (!conversation) return;

    const userMsg = localMessage(content, "user");
    set({ sending: true, error: null, messages: [...get().messages, userMsg] });

    try {
      const data = await chatService.sendMessage(conversation.id, { content });

      // 追加 AI 回复
      let nextMessages = [...get().messages, data.message];

      // AI 判定信息充足 → 对话自动完成，更新 conversation
      let nextConversation = { ...conversation };
      if (data.conversationStatus === "completed") {
        nextConversation = {
          ...nextConversation,
          status: "completed",
          improvedPrompt: data.improvedPrompt ?? null,
          comparisonResult: data.comparisonResult ?? null,
          currentRound: data.currentRound,
        };
      } else {
        nextConversation = {
          ...nextConversation,
          status: "active",
          currentRound: data.currentRound,
        };
      }

      set({
        conversation: nextConversation,
        messages: nextMessages,
        sending: false,
      });
    } catch (err) {
      // 请求失败：移除本地预置的用户消息，避免假消息残留
      set({
        sending: false,
        messages: get().messages.filter((m) => m.id !== userMsg.id),
        error: err instanceof Error ? err.message : "发送失败",
      });
      throw err;
    }
  },

  /** 用户主动完成对话 POST /api/chat/:id/complete */
  completeChat: async () => {
    const { conversation } = get();
    if (!conversation) return;

    set({ sending: true, error: null });
    try {
      const data = await chatService.complete(conversation.id);
      const updated = data.conversation;

      set({
        conversation: updated,
        sending: false,
      });

      // 重新拉取完整消息列表（完成后 AI 会追加 summary 消息）
      try {
        const detail = await chatService.getDetail(updated.id);
        set({ messages: detail.messages });
      } catch {
        // 详情拉取失败不阻塞主流程
      }
    } catch (err) {
      set({ sending: false, error: err instanceof Error ? err.message : "完成对话失败" });
      throw err;
    }
  },

  /** 对话评分 POST /api/chat/:id/rating */
  rateChat: async (rating) => {
    const { conversation } = get();
    if (!conversation) return;

    set({ error: null });
    try {
      await chatService.rate(conversation.id, rating);
      set({ rated: true });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "评分失败" });
      throw err;
    }
  },

  reset: () => set({ conversation: null, messages: [], sending: false, error: null, rated: false }),
}));
