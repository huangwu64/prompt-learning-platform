import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Sparkles, Send, Square } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SparkLogo } from "@/components/chat/SparkLogo";
import { ResultView } from "@/components/chat/ResultView";

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
    createChat,
    sendMessage,
    completeChat,
    rateChat,
    reset,
  } = useChatStore();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="h-full flex flex-col wb-bg min-w-0">
      {/* ===== 对话头部 ===== */}
      {conversation && (
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

      {/* ===== 消息区 ===== */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
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
            </div>

            <div className="w-full max-w-3xl flex flex-col gap-3.5">
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
            </div>
          </div>
        ) : (
          /* 对话中：消息流 */
          <div className="py-8 flex flex-col gap-6 max-w-4xl mx-auto px-5 md:px-6">
            {messages.map((msg, i) => (
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

      {/* ===== 底部输入区 ===== */}
      {conversation && (
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
    </div>
  );
}
