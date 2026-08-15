import { create } from "zustand";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/store/authStore";
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ===== 游客演示（demo-token）用的苏格拉底追问流程 ===== */

/** 追问过程中收集的用户答案（demo 专用，非响应式） */
let demoAnswers: string[] = [];

/** 五要素追问池（按轮次推进） */
const DEMO_QUESTIONS = [
  "你的提示词缺少「角色设定」。希望 AI 扮演什么角色来完成这个任务？",
  "「任务描述」还不够具体。你希望 AI 具体完成什么？想要达成什么结果？",
  "「上下文」信息不足。有什么背景、场景或参考资料需要补充吗？",
  "关于「输出格式」，你希望结果是什么形式？比如分点、表格、字数限制？",
  "最后确认「约束条件」：有什么必须避免或必须包含的要求吗？",
];

const DEMO_IMPROVEMENTS = [
  "补充了角色设定，让 AI 明确自己的定位",
  "细化了任务描述，输出目标更清晰",
  "加入了上下文背景，回答更贴合场景",
  "明确了输出格式与约束条件",
];

/** 基于原始需求 + 追问收集的信息拼装优化后的提示词 */
function demoImproved(prompt: string, answers: string[]): string {
  const role = answers[0]?.trim() ? `你是一位${answers[0].trim()}。` : "你是一位资深专家。";
  const ctx = answers[2]?.trim() ? `\n\n【背景】${answers[2].trim()}` : "";
  const fmt = answers[3]?.trim() ? `\n- 输出格式：${answers[3].trim()}` : "\n- 输出格式：结构清晰、条理分明";
  const cons = answers[4]?.trim() ? `\n- 约束条件：${answers[4].trim()}` : "";
  return `${role}请帮我完成：${prompt}${ctx}\n\n【输出要求】${fmt}${cons}`;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversation: null,
  messages: [],
  sending: false,
  error: null,
  rated: false,

  /** 创建对话 POST /api/chat（demo 走本地模拟） */
  createChat: async (prompt, topicId) => {
    set({ sending: true, error: null });
    const isDemo = useAuthStore.getState().token === "demo-token";

    if (isDemo) {
      await sleep(700); // 模拟 AI 思考
      demoAnswers = [];
      const conversation: Conversation = {
        id: `demo_${Date.now()}`,
        userId: "user_demo",
        originalPrompt: prompt,
        improvedPrompt: null,
        comparisonResult: null,
        rating: null,
        status: "active",
        currentRound: 1,
        maxRounds: 5,
        createdAt: new Date().toISOString(),
      };
      set({
        conversation,
        messages: [localMessage(prompt, "user"), localMessage(DEMO_QUESTIONS[0], "assistant")],
        sending: false,
        rated: false,
      });
      return;
    }

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

  /** 用户回复 POST /api/chat/:id/message（demo 走本地模拟） */
  sendMessage: async (content) => {
    const { conversation } = get();
    if (!conversation) return;

    const userMsg = localMessage(content, "user");
    set({ sending: true, error: null, messages: [...get().messages, userMsg] });

    const isDemo = useAuthStore.getState().token === "demo-token";
    if (isDemo) {
      await sleep(800);
      const nextRound = conversation.currentRound + 1;
      demoAnswers.push(content);
      const msgs = [...get().messages];

      if (nextRound >= conversation.maxRounds) {
        const improved = demoImproved(conversation.originalPrompt, demoAnswers);
        const nextConversation: Conversation = {
          ...conversation,
          status: "completed",
          currentRound: nextRound,
          improvedPrompt: improved,
          comparisonResult: { improvements: DEMO_IMPROVEMENTS },
        };
        msgs.push(localMessage(improved, "assistant"));
        msgs.push(localMessage("对话完成！以上是优化后的提示词，可直接复制使用。", "assistant"));
        set({ conversation: nextConversation, messages: msgs, sending: false });
      } else {
        const nextConversation: Conversation = {
          ...conversation,
          status: "active",
          currentRound: nextRound,
        };
        const qIdx = Math.min(nextRound - 1, DEMO_QUESTIONS.length - 1);
        msgs.push(localMessage(DEMO_QUESTIONS[qIdx], "assistant"));
        set({ conversation: nextConversation, messages: msgs, sending: false });
      }
      return;
    }

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

  /** 用户主动完成对话 POST /api/chat/:id/complete（demo 走本地模拟） */
  completeChat: async () => {
    const { conversation } = get();
    if (!conversation) return;

    set({ sending: true, error: null });
    const isDemo = useAuthStore.getState().token === "demo-token";

    if (isDemo) {
      await sleep(600);
      const improved = demoImproved(conversation.originalPrompt, demoAnswers);
      const updated: Conversation = {
        ...conversation,
        status: "completed",
        currentRound: conversation.maxRounds,
        improvedPrompt: improved,
        comparisonResult: { improvements: DEMO_IMPROVEMENTS },
      };
      set({
        conversation: updated,
        messages: [...get().messages, localMessage("对话完成！已根据已有信息生成优化后的提示词。", "assistant")],
        sending: false,
      });
      return;
    }

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

  /** 对话评分 POST /api/chat/:id/rating（demo 直接成功） */
  rateChat: async (rating) => {
    const { conversation } = get();
    if (!conversation) return;

    set({ error: null });
    const isDemo = useAuthStore.getState().token === "demo-token";
    if (isDemo) {
      await sleep(300);
      set({ rated: true });
      return;
    }

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
