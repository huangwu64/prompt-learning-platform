import { Briefcase, PenLine, Code2, Palette, GraduationCap, Coffee, type LucideIcon } from "lucide-react";
import type { PromptCategory } from "../galleryData";

export const categoryMeta: Record<
  PromptCategory,
  { label: PromptCategory; icon: LucideIcon; badge: string; iconColor: string }
> = {
  职场效率: { label: "职场效率", icon: Briefcase, badge: "bg-blue-50 text-blue-600", iconColor: "text-blue-600" },
  内容写作: { label: "内容写作", icon: PenLine, badge: "bg-emerald-50 text-emerald-600", iconColor: "text-emerald-600" },
  编程开发: { label: "编程开发", icon: Code2, badge: "bg-indigo-50 text-indigo-600", iconColor: "text-indigo-600" },
  设计创意: { label: "设计创意", icon: Palette, badge: "bg-fuchsia-50 text-fuchsia-600", iconColor: "text-fuchsia-600" },
  学习成长: { label: "学习成长", icon: GraduationCap, badge: "bg-amber-50 text-amber-600", iconColor: "text-amber-600" },
  生活日常: { label: "生活日常", icon: Coffee, badge: "bg-rose-50 text-rose-600", iconColor: "text-rose-600" },
};

/** 作者头像渐变（按名字确定性取值，避免每次不同） */
const avatarGradients = [
  "linear-gradient(135deg,#4B3FE3,#6B5BFF)",
  "linear-gradient(135deg,#0EA5E9,#6366F1)",
  "linear-gradient(135deg,#00B983,#0EA5E9)",
  "linear-gradient(135deg,#F59E0B,#EF4444)",
  "linear-gradient(135deg,#8B5CF6,#EC4899)",
  "linear-gradient(135deg,#14B8A6,#84CC16)",
];
export function authorGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return avatarGradients[h % avatarGradients.length];
}

/** 相对时间（用于"3 天前提交"） */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "刚刚";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "刚刚";
  if (min < 60) return `${min} 分钟前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour} 小时前`;
  const day = Math.floor(hour / 24);
  if (day < 30) return `${day} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

/** 数字缩写：1234 → 1.2k（中文语境用万? 用 k/万 混合） */
export function fmtCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // 降级：选区复制（覆盖非安全上下文）
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
