import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Sparkles, Send, Square, History, Gauge, ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { chatService } from "@/services/chatService";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SparkLogo } from "@/components/chat/SparkLogo";
import { ResultView } from "@/components/chat/ResultView";
import { HistoryDrawer } from "@/components/chat/HistoryDrawer";
import { LiveProgressPanel } from "@/components/chat/LiveProgressPanel";
import type { ConversationHistoryItem } from "@/types";

/** AI 思考指示器：三点跳动 */
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="AI 正在思考">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-blue-500"
          animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

/**
 * 苏格拉底对话页（核心模块）— 参考 highstorm 中性灰
 */
export default function ChatPage() {
  const {
    conversation,
    messages,
    sending,
    error,
    rated,
    viewingHistory,
    createChat,
    sendMessage,
    completeChat,
    rateChat,
    loadHistory,
    resumeChat,
    reset,
  } = useChatStore();

  const [input, setInput] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [activeChat, setActiveChat] = useState<ConversationHistoryItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 欢迎屏上查一下有没有未完成的对话。
  // 「同一用户只能有一个 active 对话」是后端规则，不提前告知的话，
  // 用户点「开始对话」只会被拒，而这里原本连错误都不显示 —— 表现为「点了没反应」。
  useEffect(() => {
    if (conversation) return;
    let cancelled = false;
    chatService
      .getHistory({ page: 1, pageSize: 1, status: "active" })
      .then((data) => {
        if (!cancelled) setActiveChat(data.items[0] ?? null);
      })
      .catch(() => {
        if (!cancelled) setActiveChat(null);
      });
    return () => {
      cancelled = true;
    };
  }, [conversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, conversation?.status]);

  const handleCreate = async () => {
    const prompt = input.trim();
    if (!prompt || sending) return;
    setInput("");
    try {
      await createChat(prompt);
    } catch {
      setInput(prompt);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    try {
      await sendMessage(content);
    } catch {
      setInput(content);
    }
  };

  const handleSubmit = () => {
    if (conversation) handleSend();
    else handleCreate();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isCompleted = conversation?.status === "completed";

  /** 从历史抽屉选择一条：载入其完整内容（气泡 + 结果） */
  const openFromHistory = async (item: ConversationHistoryItem) => {
    const cur = conversation;
    if (cur && cur.status === "active" && messages.length > 2) {
      if (!window.confirm("载入历史对话会替换当前未完成的对话，确定继续吗？")) return;
    }
    try {
      await loadHistory(item.id);
      setHistoryOpen(false);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "载入历史对话失败");
    }
  };

  return (
    <div className="h-full flex flex-col wb-bg min-w-0">
      {/* ===== 历史回看头部（只读）===== */}
      {conversation && viewingHistory && (
        <header className="shrink-0 px-6 md:px-8 py-3.5 border-b border-app-border flex items-center gap-4 bg-app-surface/60 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 shrink-0 rounded-lg bg-app-chrome border border-app-border text-app-t3 flex items-center justify-center">
              <History className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm font-medium text-app-fg truncate">
                {conversation.originalPrompt}
              </h1>
              <p className="text-[11px] text-app-t4">
                历史记录 · 只读回看（查看记录与评分，不支持继续输入）
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className={`wb-badge ${isCompleted ? "wb-badge-blue" : ""}`}>
              {isCompleted ? "已完成" : "进行中"}
            </span>
            <button
              onClick={() => setHistoryOpen(true)}
              title="回到历史记录列表"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-app-t3 hover:text-blue-600 hover:bg-blue-50 transition duration-150 ease-in-out"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">历史记录</span>
            </button>
            <button onClick={reset} className="wb-btn h-8 px-3 text-xs whitespace-nowrap">
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              退出查看
            </button>
          </div>
        </header>
      )}

      {/* ===== 对话头部（进行中 / 刚完成的对话）===== */}
      {conversation && !viewingHistory && (
        <header className="shrink-0 px-6 md:px-8 py-3.5 border-b border-app-border flex items-center gap-4 bg-app-surface/60 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <MessageSquare className="w-3.5 h-3.5 text-white" />
            </span>
            <h1 className="text-sm font-medium text-app-t2 truncate">
              {conversation.originalPrompt}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowProgress((v) => !v)}
              title="实时学习评分面板"
              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs transition duration-150 ease-in-out ${
                showProgress ? "text-blue-600 bg-blue-50" : "text-app-t3 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{showProgress ? "评分中" : "实时评分"}</span>
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              title="查看历史对话记录"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-app-t3 hover:text-blue-600 hover:bg-blue-50 transition duration-150 ease-in-out"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">历史记录</span>
            </button>
            <span className="text-xs text-app-t4 whitespace-nowrap tabular-nums">
              追问 {Math.min(conversation.currentRound, conversation.maxRounds)} / {conversation.maxRounds} 轮
            </span>
            <div className="w-28 h-1.5 rounded-full bg-app-chrome overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-in-out ${
                  isCompleted ? "bg-blue-500" : "bg-blue-400"
                }`}
                style={{
                  width: `${Math.min((conversation.currentRound / conversation.maxRounds) * 100, 100)}%`,
                }}
              />
            </div>
            <span className={`wb-badge ${isCompleted ? "wb-badge-blue" : ""}`}>
              {isCompleted ? "已完成" : "进行中"}
            </span>
          </div>
        </header>
      )}

      {/* ===== 消息区 + 右侧实时评分 ===== */}
      <div className="flex-1 min-h-0 flex">
        <div ref={scrollRef} className="flex-1 min-w-0 overflow-y-auto">
        {!conversation ? (
          /* 欢迎屏 */
          <div className="h-full flex flex-col items-center justify-center px-6 gap-9 wb-reveal">
            <div className="text-center">
              <motion.div
                className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white flex items-center justify-center shadow-[0_14px_34px_-10px_rgba(94,106,210,0.55)]"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="w-7 h-7" />
              </motion.div>
              <h2 className="font-display text-3xl md:text-4xl font-medium tracking-tight text-app-fg">苏格拉底对话</h2>
              <p className="wb-text mt-3.5 text-[15px] max-w-md mx-auto leading-relaxed">
                描述你想要的提示词，AI 会通过最多 5 轮追问帮你把它打磨清楚
              </p>
              <button
                onClick={() => setHistoryOpen(true)}
                className="mx-auto mt-3 inline-flex items-center gap-1.5 text-[13px] text-app-t3 hover:text-blue-600 transition-colors duration-150"
              >
                <History className="w-4 h-4" />
                查看历史对话记录
              </button>
            </div>

            <div className="w-full max-w-3xl flex flex-col gap-3.5">
              {/* 有未完成的对话时明确告知并提供继续入口 */}
              {activeChat && (
                <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 px-4 py-3">
                  <span className="w-8 h-8 shrink-0 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-app-fg">你有一个进行中的对话</p>
                    <p className="text-[11px] text-app-t3 truncate">
                      {activeChat.originalPrompt} · 第 {Math.min(activeChat.currentRound, 5)}/5 轮
                    </p>
                  </div>
                  <button
                    onClick={() => void resumeChat(activeChat.id)}
                    className="wb-btn wb-btn-primary h-8 px-3 text-xs shrink-0 whitespace-nowrap"
                  >
                    继续这一条
                  </button>
                </div>
              )}

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={6}
                placeholder="例如：帮我写一封给上级的季度汇报邮件…"
                className="wb-input px-6 py-5 text-base leading-relaxed !rounded-2xl"
              />
              <div className="flex items-center justify-between px-1.5">
                <span className="text-xs text-app-t4">Enter 发送 · Shift+Enter 换行</span>
                <button
                  onClick={handleCreate}
                  disabled={sending || !input.trim()}
                  className="wb-btn wb-btn-primary !px-6 !py-2.5"
                >
                  {sending ? <ThinkingDots /> : <Sparkles className="w-4 h-4" />}
                  {sending ? "正在思考" : "开始对话"}
                </button>
              </div>

              {/* 欢迎屏也要显示错误：否则创建失败时界面上什么都没发生 */}
              {error && (
                <p className="text-xs text-red-600 text-center flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* 对话中：消息流 */
          <div className="py-8 flex flex-col gap-6 max-w-4xl mx-auto px-5 md:px-6">
            {/* filter(Boolean) 是防御性的：任何来源的空消息都不该让整页崩掉 */}
            {messages.filter(Boolean).map((msg, i) => (
              <MessageBubble key={msg.id} message={msg} index={i} />
            ))}

            {sending && (
              <div className="flex gap-3.5">
                <SparkLogo size={36} />
                <div className="px-5 py-4 rounded-2xl rounded-tl-md bg-white border border-app-border flex items-center gap-3 text-sm text-app-t3">
                  <ThinkingDots />
                  AI 正在思考…
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-500 text-center">{error}</p>
            )}

            {isCompleted && !sending && (
              <div className="mt-2">
                <ResultView
                  conversation={conversation}
                  rated={rated}
                  submitting={sending}
                  onRate={(r) => rateChat(r)}
                />
              </div>
            )}
          </div>
        )}
        </div>

        {/* 实时评分面板只在「进行中的对话」有意义；历史回看是只读的，不显示 */}
        {conversation && showProgress && !viewingHistory && (
          <LiveProgressPanel
            conversation={conversation}
            messages={messages}
            onHide={() => setShowProgress(false)}
          />
        )}
      </div>

      {/* ===== 底部输入区 =====
          历史回看时**整块隐藏** —— 按设计历史记录只展示记录与评分，不接受输入 */}
      {conversation && !viewingHistory && (
        <footer className="shrink-0 px-6 md:px-8 py-4 border-t border-app-border bg-app-surface/60 backdrop-blur-sm">
          {isCompleted ? (
            <div className="max-w-4xl mx-auto flex flex-col items-center gap-3">
              <p className="text-sm text-app-t3">本次对话已完成，开始一次新的打磨？</p>
              <button onClick={reset} className="wb-btn wb-btn-primary">
                <Sparkles className="w-4 h-4" />
                开始新对话
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
              <div className="flex items-end gap-2.5">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={Math.min(Math.max(input.split("\n").length, 2), 8)}
                  placeholder="回答 AI 的追问，信息越具体优化效果越好…"
                  className="wb-input flex-1 !px-5 !py-3.5 !text-[15px] !rounded-2xl"
                />
                <motion.button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  whileHover={sending || !input.trim() ? undefined : { scale: 1.06 }}
                  whileTap={sending || !input.trim() ? undefined : { scale: 0.92 }}
                  className="w-12 h-12 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_6px_18px_-4px_rgba(94,106,210,0.5)]"
                  title="发送"
                >
                  {sending ? <ThinkingDots /> : <Send className="w-5 h-5" />}
                </motion.button>
              </div>
              <div className="flex items-center justify-between px-1.5">
                <span className="text-xs text-app-t4">Enter 发送 · Shift+Enter 换行</span>
                <button
                  onClick={completeChat}
                  disabled={sending}
                  className="flex items-center gap-1.5 text-xs text-app-t4 hover:text-app-t2 transition duration-150 ease-in-out disabled:opacity-40"
                >
                  <Square className="w-3 h-3" />
                  不想回答追问了，直接生成结果
                </button>
              </div>
            </div>
          )}
        </footer>
      )}

      {/* 历史对话抽屉 */}
      {historyOpen && (
        <HistoryDrawer onClose={() => setHistoryOpen(false)} onSelect={openFromHistory} />
      )}
    </div>
  );
}
