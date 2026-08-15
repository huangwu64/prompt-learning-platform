import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * 统一区块标题（全站视觉锚点）：
 * Linear 三色渐变图标容器 + 标题 + 可选右侧操作区。
 * 所有页面的区块头（表单区 / 排行榜 / 能力 / 徽章等）统一使用，保证风格一致。
 */
export function SectionTitle({
  icon: Icon,
  children,
  right,
  className,
}: {
  icon: LucideIcon;
  children: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-white shadow-[0_2px_8px_-2px_rgba(94,106,210,0.5)]"
        style={{ background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)" }}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      <h3 className="text-sm font-semibold text-app-fg">{children}</h3>
      {right && <span className="ml-auto">{right}</span>}
    </div>
  );
}
