import {
  Map,
  MessageSquare,
  FileText,
  Trophy,
  FlaskConical,
  Radar,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore, type SectionId } from "@/store/uiStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskList } from "./TaskList";

/**
 * 左侧导航栏（模仿 WorkBuddy 会话列表）：
 * 浅灰底、紧凑、选中蓝色高亮。
 */
const navItems: { id: SectionId; label: string; icon: typeof Map; core?: boolean }[] = [
  { id: "learning", label: "学习地图", icon: Map },
  { id: "chat", label: "苏格拉底对话", icon: MessageSquare, core: true },
  { id: "works", label: "作品工厂", icon: FileText },
  { id: "challenge", label: "提示词挑战赛", icon: Trophy },
  { id: "lab", label: "提示词实验室", icon: FlaskConical },
  { id: "profile", label: "AI 能力雷达", icon: Radar },
];

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const activeSection = useUiStore((s) => s.activeSection);
  const setActiveSection = useUiStore((s) => s.setActiveSection);
  const collapsed = useUiStore((s) => s.collapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  /* ===== 折叠态：悬浮按钮（左上角） ===== */
  if (collapsed) {
    return (
      <button
        onClick={toggleSidebar}
        title="展开导航栏"
        className="fixed left-3 top-3 z-50 w-8 h-8 rounded-md border border-[#E5E6EA] bg-white flex items-center justify-center text-[#737373] hover:text-blue-600 hover:border-blue-300 shadow-sm transition duration-150 ease-in-out"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    );
  }

  /* ===== 展开态 ===== */
  return (
    <aside className="sticky top-0 h-screen w-60 shrink-0 bg-[#F0F1F4] border-r border-[#E5E6EA] flex flex-col">
      {/* 顶部：logo + 折叠按钮 */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-[#E5E6EA]">
        <span className="text-sm font-semibold text-[#171717] truncate">Spark</span>
        <button
          onClick={toggleSidebar}
          title="折叠导航栏"
          className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-[#A0A0A8] hover:text-[#171717] hover:bg-[#F0F1F4] transition duration-150 ease-in-out"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 导航 */}
      <nav className="px-2 py-3 flex flex-col gap-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`wb-nav-item ${isActive ? "wb-nav-item-active" : ""}`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ease-out ${isActive ? "text-blue-600 scale-110" : ""}`} />
              {item.label}
              {item.core && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
            </button>
          );
        })}
      </nav>

      {/* 任务列表 */}
      <TaskList />

      {/* 底部：用户 + 退出 */}
      <div className="px-2 pb-2 mt-auto">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 mb-1">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-blue-50 text-blue-700 font-medium">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-[#171717] truncate">{user?.username ?? "学习者"}</p>
            <p className="text-[11px] text-[#A0A0A8] truncate">连续 {user?.streakDays ?? 0} 天</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#737373] hover:bg-[#F0F1F4] hover:text-[#171717] transition duration-150 ease-in-out"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
