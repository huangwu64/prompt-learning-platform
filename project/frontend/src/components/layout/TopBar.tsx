import { Sparkles } from "lucide-react";
import { useUiStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

/** 顶栏模块名映射 */
const sectionNames: Record<string, string> = {
  learning: "学习地图",
  chat: "苏格拉底对话",
  works: "作品工厂",
  challenge: "提示词挑战赛",
  lab: "提示词实验室",
  profile: "AI 能力雷达",
};

/**
 * 顶部栏（模仿 WorkBuddy 工作台）：
 * 左侧 logo + 当前模块名，右侧用户头像。不放模块导航（导航在左侧栏）。
 */
export function TopBar() {
  const activeSection = useUiStore((s) => s.activeSection);
  const user = useAuthStore((s) => s.user);

  return (
    <header className="h-12 shrink-0 bg-white border-b border-[#E5E6EA] px-4 flex items-center justify-between">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="w-5 h-5 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-3 h-3 text-white" />
        </span>
        <span className="text-sm font-semibold text-[#171717] whitespace-nowrap">Spark</span>
        <span className="text-[#D6D8DE]">/</span>
        <span className="text-sm text-[#737373] truncate">{sectionNames[activeSection] ?? "工作台"}</span>
      </div>

      <Avatar className="w-7 h-7 shrink-0 border border-[#E5E6EA]">
        <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-medium">
          {user?.username?.[0]?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>
    </header>
  );
}
