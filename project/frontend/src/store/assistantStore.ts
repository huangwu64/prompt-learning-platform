import { create } from "zustand";
import assistantService from "@/services/assistantService";
import { streamSse, type SseHandle } from "@/lib/sseClient";
import type { AssistantConversation, Message } from "@/types";

export type AssistantView = "chat" | "history";

interface AssistantState {
  open: boolean;
  view: AssistantView;

  conversations: AssistantConversation[];
  listLoading: boolean;

  activeId: string | null;
  title: string | null;
  messages: Message[];
  loadingDetail: boolean;

  sending: boolean;
  streamError: string | null;
  /** 正在生成的那条助手消息 id：用于纯文本渲染与光标 */
  streamingMessageId: string | null;

  openDrawer: () => void;
  closeDrawer: () => void;
  setView: (v: AssistantView) => void;

  loadConversations: () => Promise<void>;
  openConversation: (id: string) => Promise<void>;
  newConversation: () => void;

  send: (content: string) => Promise<void>;
  stop: () => void;
}

// ---- 流式相关的模块级状态 ----
// 放模块级而不是 store state：token 是每秒几十次的更新，
// 每次都走 setState 会让整个消息列表重渲染。这里先攒进 buffer，
// 由定时器按 ~50ms 的节奏批量 flush 进 store。
let handle: SseHandle | null = null;
let pending = "";
let flushTimer: number | undefined;
let streamingId: string | null = null;

function tempId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function stopFlushTimer() {
  if (flushTimer !== undefined) {
    window.clearInterval(flushTimer);
    flushTimer = undefined;
  }
}

/** 把已攒下的增量一次性写入 store */
function flushPending() {
  if (!pending) return;
  const chunk = pending;
  pending = "";
  const targetId = streamingId;
  useAssistantStore.setState((s) => ({
    messages: s.messages.map((m) =>
      m.id === targetId ? { ...m, content: m.content + chunk } : m
    ),
  }));
}

function clearStream() {
  stopFlushTimer();
  handle = null;
  streamingId = null;
  pending = "";
}

export const useAssistantStore = create<AssistantState>()((set, get) => ({
  open: false,
  view: "chat",

  conversations: [],
  listLoading: false,

  activeId: null,
  title: null,
  messages: [],
  loadingDetail: false,

  sending: false,
  streamError: null,
  streamingMessageId: null,

  openDrawer: () => {
    set({ open: true });
    void get().loadConversations();
  },

  closeDrawer: () => set({ open: false }),

  setView: (view) => set({ view }),

  loadConversations: async () => {
    set({ listLoading: true });
    try {
      const page = await assistantService.list({ page: 1, pageSize: 50 });
      set({ conversations: page.items });
    } catch {
      // 列表拉取失败不该打断正在进行的对话，静默处理
    } finally {
      set({ listLoading: false });
    }
  },

  openConversation: async (id) => {
    set({ loadingDetail: true, view: "chat", streamError: null });
    try {
      const detail = await assistantService.detail(id);
      set({ activeId: detail.id, title: detail.title, messages: detail.messages });
    } catch (err) {
      set({ streamError: err instanceof Error ? err.message : "加载会话失败" });
    } finally {
      set({ loadingDetail: false });
    }
  },

  /** 豆包式「新对话」：清空当前上下文开始新会话，历史仍保留在列表里 */
  newConversation: () => {
    handle?.abort();
    clearStream();
    set({
      activeId: null,
      title: null,
      messages: [],
      streamError: null,
      sending: false,
      streamingMessageId: null,
      view: "chat",
    });
  },

  send: async (content) => {
    const text = content.trim();
    if (!text || get().sending) return;

    // 首次发言时才真正建会话，避免点开就留下一堆空会话
    let convId = get().activeId;
    if (!convId) {
      try {
        const created = await assistantService.create();
        convId = created.id;
        set({ activeId: created.id, title: created.title });
      } catch (err) {
        set({ streamError: err instanceof Error ? err.message : "创建会话失败" });
        return;
      }
    }

    const userMessage: Message = {
      id: tempId("user"),
      role: "user",
      content: text,
      messageType: "chat",
      createdAt: new Date().toISOString(),
    };
    const assistantMessage: Message = {
      id: tempId("assistant"),
      role: "assistant",
      content: "",
      messageType: "chat",
      createdAt: new Date().toISOString(),
    };
    streamingId = assistantMessage.id;

    set((s) => ({
      messages: [...s.messages, userMessage, assistantMessage],
      sending: true,
      streamError: null,
      streamingMessageId: assistantMessage.id,
    }));

    pending = "";
    flushTimer = window.setInterval(flushPending, 50);

    const targetConvId = convId;
    handle = streamSse(
      "/api/assistant/chat/stream",
      { conversationId: targetConvId, content: text },
      {
        onEvent: (event, raw) => {
          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(raw);
          } catch {
            return; // 忽略无法解析的帧
          }

          if (event === "delta") {
            if (typeof payload.content === "string") {
              pending += payload.content;
            }
            return;
          }

          if (event === "done") {
            flushPending();
            const realId = typeof payload.messageId === "string" ? payload.messageId : null;
            const doneId = streamingId;
            clearStream();
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === doneId && realId ? { ...m, id: realId } : m
              ),
              sending: false,
              streamingMessageId: null,
            }));
            void get().loadConversations();
            return;
          }

          if (event === "error") {
            flushPending();
            clearStream();
            set({
              sending: false,
              streamingMessageId: null,
              streamError:
                typeof payload.error === "string" ? payload.error : "AI 服务暂时不可用",
            });
          }
          // meta 事件无需处理：会话 id 在发消息前就已经拿到
        },

        onError: (err) => {
          // 保留已收到的部分内容，只是标记出错，让用户能看到「答到一半断了」
          flushPending();
          clearStream();
          set({ sending: false, streamingMessageId: null, streamError: err.message });
        },

        onClose: () => {
          clearStream();
          if (get().sending) {
            set({ sending: false, streamingMessageId: null });
          }
        },
      }
    );
  },

  stop: () => {
    handle?.abort();
    flushPending();
    clearStream();
    set({ sending: false, streamingMessageId: null });
  },
}));
