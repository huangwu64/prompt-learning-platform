import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** 右侧操作区（如刷新按钮、筛选器） */
  right?: ReactNode;
}

/**
 * 后台页面页头：品牌渐变图标 + 衬线标题 + 说明。
 * 与工作台的页头范式一致（见 pages/works/WorksPage.tsx）。
 */
export function AdminPageHeader({ icon: Icon, title, description, right }: Props) {
  return (
    <div className="wb-reveal flex items-start gap-3">
      <span
        className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center text-white shadow-[0_6px_18px_-4px_rgba(75,63,227,0.5)]"
        style={{ background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)" }}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="font-display text-2xl md:text-[26px] font-medium tracking-tight text-app-fg">
          {title}
        </h1>
        {description && <p className="wb-text text-sm mt-0.5">{description}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
