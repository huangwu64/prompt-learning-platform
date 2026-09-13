import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowUp, History, MessagesSquare, Plus, Square, X } from "lucide-react";
import { useAssistantStore } from "@/store/assistantStore";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { SparkLogo } from "@/components/chat/SparkLogo";
import { AssistantHistoryPanel } from "./AssistantHistoryPanel";

/** 空态引导文案：都是「教人提问」方向，符合助手定位 */
const SUGGESTIONS = [
  "什么是提示词的「五要素」？",
  "学习地图上的知识点怎么解锁？",
  "帮我看看这段提示词还缺什么",
];

/** 三跳点「思考中」 */
function ThinkingDots() {
  return (
    <div className="flex items-center gap-3.5">
      <SparkLogo size={36} animate={false} />
      <div className="flex items-center gap-1 px-5 py-3.5 rounded-2xl rounded-tl-md border border-app-border bg-app-surface">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-app-t4 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
          />
        ))}
      </div>
    </div>
  );
}

/** 助手抽屉：未打开时不渲染（外面套 AnimatePresence 以支持退出动画） */
export function AssistantDrawer() {
  const open = useAssistantStore((s) => s.open);
  return <AnimatePresence>{open && <DrawerBody />}</AnimatePresence>;
}

function DrawerBody() {
  const reduceMotion = useReducedMotion();

  const view = useAssistantStore((s) => s.view);
  const messages = useAssistantStore((s) => s.messages);
  const sending = useAssistantStore((s) => s.sending);
  const streamError = useAssistantStore((s) => s.streamError);
  const loadingDetail = useAssistantStore((s) => s.loadingDetail);
  const streamingMessageId = useAssistantStore((s) => s.streamingMessageId);

  const closeDrawer = useAssistantStore((s) => s.closeDrawer);
  const setView = useAssistantStore((s) => s.setView);
  const newConversation = useAssistantStore((s) => s.newConversation);
  const send = useAssistantStore((s) => s.send);
  const stop = useAssistantStore((s) => s.stop);

  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 锁定背景滚动 + Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [closeDrawer]);

  // 新消息 / 增量到达时跟随到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  // textarea 自适应高度（1~5 行）
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [input]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [view]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    void send(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // isComposing：中文输入法用回车确认候选词时不能当作「发送」
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 首 token 到来前显示「思考中」，避免一个空气泡挂着
  const streamingIndex = messages.findIndex((m) => m.id === streamingMessageId);
  const showThinking = streamingIndex !== -1 && messages[streamingIndex].content.length === 0;
  const visibleMessages = showThinking ? messages.slice(0, streamingIndex) : messages;

  return (
    <div className="fixed inset-0 z-[95]">
      {/* 遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1.5px]"
        onClick={closeDrawer}
      />

      {/* 面板 */}
      <motion.aside
        initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
        animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="absolute right-0 top-0 h-full w-full max-w-[460px] bg-app-surface border-l border-app-border shadow-[-16px_0_48px_-12px_rgba(20,20,60,0.25)] flex flex-col"
      >
        {/* 头部 */}
        <div className="shrink-0 px-5 py-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <SparkLogo size={32} />
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-medium tracking-tight text-app-fg">
                提问导师
              </h2>
              <p className="text-[11px] text-app-t4 truncate">
                {view === "history" ? "回看历史对话" : "引导式教学，帮你想清楚再动手"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setView(view === "history" ? "chat" : "history")}
              aria-label={view === "history" ? "返回对话" : "历史对话"}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
            >
              {view === "history" ? (
                <MessagesSquare className="w-4 h-4" />
              ) : (
                <History className="w-4 h-4" />
              )}
            </button>
            <button
              type="button"
              onClick={newConversation}
              aria-label="新对话"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={closeDrawer}
              aria-label="关闭"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {view === "history" ? (
            <AssistantHistoryPanel />
          ) : loadingDetail ? (
            <div className="h-full flex items-center justify-center gap-2 text-sm text-app-t3">
              <span className="w-4 h-4 border-2 border-app-borderStrong border-t-blue-600 rounded-full animate-spin" />
              加载中…
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 px-6">
              <SparkLogo size={52} />
              <div className="flex flex-col gap-1.5">
                <p className="text-[15px] font-medium text-app-fg">有什么可以帮你的？</p>
                <p className="text-xs text-app-t4 leading-relaxed">
                  我会先问你几个问题，帮你把需求想清楚 —— 而不是直接甩给你一段模板。
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full mt-1">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    className="w-full text-left text-[13px] text-app-t2 rounded-xl border border-app-border bg-app-surface px-3.5 py-2.5 hover:border-blue-300 hover:bg-blue-50/40 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {visibleMessages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  index={i}
                  streaming={m.id === streamingMessageId}
                />
              ))}
              {showThinking && <ThinkingDots />}

              {streamError && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[13px] text-red-700 leading-snug">{streamError}</p>
                    <p className="text-[11px] text-red-600/70 mt-1">
                      已收到的内容保留在上面，可以直接重新发送。
                    </p>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="shrink-0 border-t border-app-border px-4 py-3.5">
          <div className="flex items-end gap-2.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"
              className="wb-input flex-1 resize-none py-2.5 leading-relaxed max-h-[140px]"
              disabled={view === "history"}
            />
            {sending ? (
              <button
                type="button"
                onClick={stop}
                aria-label="停止生成"
                className="wb-btn wb-btn-ghost h-10 w-10 p-0 shrink-0"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || view === "history"}
                aria-label="发送"
                className="wb-btn wb-btn-primary h-10 w-10 p-0 shrink-0"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>
    </div>
  );
}
