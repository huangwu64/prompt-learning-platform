import { useEffect, useRef, useState } from "react";
import { MessageSquare, Sparkles, Send, Square, Loader2 } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ResultView } from "@/components/chat/ResultView";

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
        <header className="shrink-0 px-6 py-3.5 border-b border-[#E5E6EA] flex items-center gap-4 bg-white/70">
          <div className="flex items-center gap-2.5 min-w-0">
            <MessageSquare className="w-4 h-4 text-[#737373] shrink-0" />
            <h1 className="text-sm font-medium text-[#3A3A3A] truncate">
              {conversation.originalPrompt}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            <span className="text-xs text-[#A0A0A8] whitespace-nowrap">
              追问 {Math.min(conversation.currentRound, conversation.maxRounds)} / {conversation.maxRounds} 轮
            </span>
            <div className="w-28 h-1.5 rounded-full bg-[#F0F1F4] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ease-in-out ${
                  isCompleted ? "bg-blue-600" : "bg-blue-400"
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
          <div className="h-full flex flex-col items-center justify-center px-6 gap-8">
            <div className="text-center">
              <div className="mx-auto mb-5 w-14 h-14 rounded-full border border-[#E5E6EA] bg-white flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#3A3A3A]" />
              </div>
              <h2 className="wb-title text-2xl md:text-3xl tracking-tight">苏格拉底对话</h2>
              <p className="wb-text mt-3 text-sm max-w-md mx-auto leading-relaxed">
                描述你想要的提示词，AI 会通过最多 5 轮追问帮你把它打磨清楚
              </p>
            </div>

            <div className="w-full max-w-2xl flex flex-col gap-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder="例如：帮我写一封给上级的季度汇报邮件…"
                className="wb-input px-5 py-4 text-[15px] leading-relaxed"
              />
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-[#A0A0A8]">Enter 发送 · Shift+Enter 换行</span>
                <button
                  onClick={handleCreate}
                  disabled={sending || !input.trim()}
                  className="wb-btn wb-btn-primary"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  开始对话
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* 对话中：消息流 */
          <div className="py-6 flex flex-col gap-5 max-w-3xl mx-auto px-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {sending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 shrink-0 rounded-full border border-[#E5E6EA] bg-white flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-[#3A3A3A]">AI</span>
                </div>
                <div className="px-4 py-3 rounded-xl rounded-tl-md bg-white border border-[#E5E6EA] flex items-center gap-2 text-sm text-[#737373]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AI 正在思考…
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 text-center">{error}</p>
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
        <footer className="shrink-0 px-6 py-4 border-t border-[#E5E6EA] bg-white/70">
          {isCompleted ? (
            <div className="max-w-3xl mx-auto flex flex-col items-center gap-3">
              <p className="text-sm text-[#737373]">本次对话已完成，开始一次新的打磨？</p>
              <button onClick={reset} className="wb-btn wb-btn-primary">
                <Sparkles className="w-4 h-4" />
                开始新对话
              </button>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-2">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={Math.min(Math.max(input.split("\n").length, 1), 6)}
                  placeholder="回答 AI 的追问，信息越具体优化效果越好…"
                  className="wb-input flex-1"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-10 h-10 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition duration-150 ease-in-out hover:bg-blue-500 active:scale-95"
                  title="发送"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-[#A0A0A8]">Enter 发送 · Shift+Enter 换行</span>
                <button
                  onClick={completeChat}
                  disabled={sending}
                  className="flex items-center gap-1.5 text-xs text-[#A0A0A8] hover:text-[#3A3A3A] transition duration-150 ease-in-out disabled:opacity-40"
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
