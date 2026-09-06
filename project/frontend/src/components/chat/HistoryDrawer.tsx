import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, X, Loader2, Star, MessageSquare, ChevronRight, LogIn } from "lucide-react";
import { chatService } from "@/services/chatService";
import { useAuthStore } from "@/store/authStore";
import type { ConversationHistoryItem } from "@/types";

interface Props {
  onClose: () => void;
  /** 选择一条历史对话（由父组件真正载入并切换视图） */
  onSelect: (item: ConversationHistoryItem) => void;
}

/** 时间：MM-DD HH:mm */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 迷你星级回显（未评分时用中横线） */
function MiniRating({ rating }: { rating: number | null }) {
  if (rating == null)
    return <span className="text-[11px] text-app-t4">未评分</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3 h-3 ${n <= rating ? "text-blue-600 fill-blue-600" : "text-app-borderStrong"}`}
        />
      ))}
    </span>
  );
}

/** 历史对话记录 · 右侧抽屉 */
export function HistoryDrawer({ onClose, onSelect }: Props) {
  const isDemo = useAuthStore((s) => s.token) === "demo-token";
  const [list, setList] = useState<ConversationHistoryItem[]>([]);
  const [loading, setLoading] = useState(!isDemo);
  const [err, setErr] = useState("");

  // 锁定背景滚动 + Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  useEffect(() => {
    if (isDemo) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await chatService.getHistory({ page: 1, pageSize: 100 });
        if (!cancelled) setList(data.items);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "加载历史记录失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  const completed = list.filter((c) => c.status === "completed");
  const ongoing = list.filter((c) => c.status === "active");

  const renderItem = (item: ConversationHistoryItem) => {
    const done = item.status === "completed";
    return (
      <button
        key={item.id}
        onClick={() => onSelect(item)}
        className="w-full text-left rounded-xl border border-app-border bg-app-surface px-4 py-3.5 flex items-start gap-3 hover:border-blue-300 hover:shadow-[0_4px_16px_-6px_rgba(75,63,227,0.25)] transition duration-150 ease-in-out"
      >
        <span
          className={`mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${
            done ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {done ? (
            <MessageSquare className="w-4 h-4" />
          ) : (
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] text-app-fg leading-snug line-clamp-2">{item.originalPrompt}</p>
          <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1">
            <span className="text-[11px] text-app-t4 tabular-nums">{fmtTime(item.updatedAt || item.createdAt)}</span>
            <span className="text-[11px] text-app-t4 tabular-nums">{Math.min(item.currentRound, 5)}/5 轮</span>
            <MiniRating rating={item.rating} />
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-app-t4 self-center shrink-0" />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[95]">
      {/* 遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/35 backdrop-blur-[1.5px]"
        onClick={onClose}
      />
      {/* 面板 */}
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        className="absolute right-0 top-0 h-full w-full max-w-[400px] bg-app-surface border-l border-app-border shadow-[-16px_0_48px_-12px_rgba(20,20,60,0.25)] flex flex-col"
      >
        {/* 头部 */}
        <div className="shrink-0 px-5 py-4 border-b border-app-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <History className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display text-[15px] font-medium tracking-tight text-app-fg">历史对话</h2>
              <p className="text-[11px] text-app-t4">回看每一次追问打磨的过程与结果</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {isDemo ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
              <span className="w-12 h-12 rounded-2xl bg-app-chrome border border-app-border flex items-center justify-center text-app-t3">
                <LogIn className="w-5 h-5" />
              </span>
              <p className="text-sm text-app-fg font-medium">游客模式下不保存历史</p>
              <p className="text-xs text-app-t4 leading-relaxed">
                注册 / 登录账号后，完成的对话会自动保存，随时可以从这里回看。
              </p>
            </div>
          ) : loading ? (
            <div className="h-full flex items-center justify-center gap-2 text-sm text-app-t3">
              <Loader2 className="w-4 h-4 animate-spin" />
              加载中…
            </div>
          ) : err ? (
            <p className="text-xs text-red-500 text-center py-8 px-4">{err}</p>
          ) : list.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-6">
              <span className="w-12 h-12 rounded-2xl bg-app-chrome border border-app-border flex items-center justify-center text-app-t3">
                <MessageSquare className="w-5 h-5" />
              </span>
              <p className="text-sm text-app-fg font-medium">还没有历史记录</p>
              <p className="text-xs text-app-t4 leading-relaxed">完成一次苏格拉底对话后，它会自动出现在这里。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {ongoing.length > 0 && (
                <section>
                  <p className="text-[11px] font-medium tracking-[0.14em] text-app-t4 mb-2 px-1">进行中</p>
                  <div className="flex flex-col gap-2">{ongoing.map(renderItem)}</div>
                </section>
              )}
              {completed.length > 0 && (
                <section>
                  <p className="text-[11px] font-medium tracking-[0.14em] text-app-t4 mb-2 px-1">
                    已完成 <span className="tabular-nums">({completed.length})</span>
                  </p>
                  <div className="flex flex-col gap-2">{completed.map(renderItem)}</div>
                </section>
              )}
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
