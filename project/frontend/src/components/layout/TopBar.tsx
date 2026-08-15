import { Map, MessageSquare, FileText, Trophy, FlaskConical, Radar } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** 顶栏模块映射（图标 + 名称） */
const sectionMeta: Record<string, { label: string; icon: typeof Map }> = {
  learning: { label: "学习地图", icon: Map },
  chat: { label: "苏格拉底对话", icon: MessageSquare },
  works: { label: "作品工厂", icon: FileText },
  challenge: { label: "提示词挑战赛", icon: Trophy },
  lab: { label: "提示词实验室", icon: FlaskConical },
  profile: { label: "能力雷达", icon: Radar },
};

/**
 * 顶部栏（模仿 WorkBuddy 工作台）：
 * 左侧 logo + 当前模块名，右侧用户头像。不放模块导航（导航在左侧栏）。
 */
export function TopBar() {
  const activeSection = useUiStore((s) => s.activeSection);
  const collapsed = useUiStore((s) => s.collapsed);
  const user = useAuthStore((s) => s.user);

  return (
    <header
      className={`h-14 shrink-0 bg-app-surface/60 backdrop-blur-md border-b border-app-border flex items-center justify-between ${
        collapsed ? "pl-14 pr-4 md:pr-6" : "px-4 md:px-6"
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-sm font-semibold text-app-fg whitespace-nowrap font-display tracking-tight">Spark</span>
        <span className="text-app-borderStrong">/</span>
        {(() => {
          const meta = sectionMeta[activeSection];
          const Icon = meta?.icon ?? Map;
          return (
            <span className="flex items-center gap-1.5 text-sm text-app-t3 truncate">
              <Icon className="w-4 h-4 text-blue-600" />
              {meta?.label ?? "工作台"}
            </span>
          );
        })()}
      </div>

      <Avatar className="w-7 h-7 shrink-0 border border-app-border">
        <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-medium">
          {user?.username?.[0]?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
