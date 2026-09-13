import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "ok" | "err" | "info";

interface Props {
  tone: Tone;
  children: React.ReactNode;
}

const STYLES: Record<Tone, string> = {
  ok: "border-accent-200 bg-accent-50 text-accent-700",
  err: "border-red-200 bg-red-50 text-red-700",
  info: "border-app-border bg-app-chrome text-app-t2",
};

const ICONS = { ok: CheckCircle2, err: AlertCircle, info: Info };

/** 页面内联提示条。后台的多数反馈用它即可，不必引入全局 toast 系统 */
export function Banner({ tone, children }: Props) {
  const Icon = ICONS[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 ${STYLES[tone]}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="text-[13px] leading-snug min-w-0">{children}</div>
    </div>
  );
}

/** 右下角浮层提示，用于操作成功/失败的即时反馈 */
export function Toast({ tone, text }: { tone: "ok" | "err"; text: string }) {
  const Icon = tone === "ok" ? CheckCircle2 : AlertCircle;
  return (
    <div className="fixed top-20 right-6 z-[200]">
      <div
        className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-[0_12px_32px_-12px_rgba(20,20,60,0.3)] ${
          tone === "ok"
            ? "border-accent-200 bg-accent-50 text-accent-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}
      >
        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
        <p className="text-[13px]">{text}</p>
      </div>
    </div>
  );
}
