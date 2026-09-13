import type { ReactNode } from "react";

type Tone = "default" | "good" | "warn" | "bad";

interface Props {
  /** 句子式标签，无尾冒号 */
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: Tone;
}

const TONE_CLASS: Record<Tone, string> = {
  default: "text-app-fg",
  good: "text-accent-600",
  warn: "text-amber-600",
  bad: "text-red-600",
};

/**
 * 概览数字卡。
 *
 * 数值刻意用正文无衬线字体（Outfit）而非 font-display：
 * 后者是 Noto Serif SC 衬线，只用于标题 —— 大字号衬线数字会读成装饰性 off-brand。
 */
export function StatCard({ label, value, hint, tone = "default" }: Props) {
  return (
    <div className="rounded-xl border border-app-border bg-app-surface px-4 py-3.5 flex flex-col gap-1">
      <p className="text-[11px] text-app-t4">{label}</p>
      <p className={`text-xl font-semibold leading-tight ${TONE_CLASS[tone]}`}>{value}</p>
      {hint && <p className="text-[11px] text-app-t4">{hint}</p>}
    </div>
  );
}
