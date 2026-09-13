import { Loader2, MessagesSquare, ChevronRight } from "lucide-react";
import { useAssistantStore } from "@/store/assistantStore";

/** 时间：MM-DD HH:mm */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 助手历史会话列表（抽屉内视图）。
 *
 * 按「豆包式」交互，这里只做「点开继续聊」，不提供删除入口
 * —— 后端的 DELETE 接口保留给后台审计/清理使用。
 */
export function AssistantHistoryPanel() {
  const conversations = useAssistantStore((s) => s.conversations);
  const listLoading = useAssistantStore((s) => s.listLoading);
  const openConversation = useAssistantStore((s) => s.openConversation);

  if (listLoading && conversations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center gap-2 text-sm text-app-t3">
        <Loader2 className="w-4 h-4 animate-spin" />
        加载中…
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-8">
        <span className="w-12 h-12 rounded-2xl bg-app-chrome border border-app-border flex items-center justify-center text-app-t3">
          <MessagesSquare className="w-5 h-5" />
        </span>
        <p className="text-sm text-app-fg font-medium">还没有对话记录</p>
        <p className="text-xs text-app-t4 leading-relaxed">
          问一个问题试试 —— 关于提示词、平台玩法或学习路径都可以。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {conversations.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => void openConversation(c.id)}
          className="w-full text-left rounded-xl border border-app-border bg-app-surface px-4 py-3.5 flex items-start gap-3 hover:border-blue-300 hover:shadow-[0_4px_16px_-6px_rgba(75,63,227,0.25)] transition duration-150 ease-in-out"
        >
          <span className="mt-0.5 w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
            <MessagesSquare className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] text-app-fg leading-snug line-clamp-2">
              {c.title || "新对话"}
            </p>
            <div className="mt-1.5 flex items-center flex-wrap gap-x-3 gap-y-1">
              <span className="text-[11px] text-app-t4 tabular-nums">
                {fmtTime(c.lastMessageAt || c.createdAt)}
              </span>
              <span className="text-[11px] text-app-t4 tabular-nums">
                {c.messageCount} 条消息
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-app-t4 self-center shrink-0" />
        </button>
      ))}
    </div>
  );
}
