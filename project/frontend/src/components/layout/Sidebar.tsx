import {
  Map,
  MessageSquare,
  FileText,
  Trophy,
  Radar,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useUiStore, type SectionId } from "@/store/uiStore";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TaskList } from "./TaskList";

/**
 * 左侧导航栏（impeccable Operate 重设计）：
 * 出版感刊徽品牌区 + 分组导航（选中指示条滑动动画）+ 今日任务 + 用户卡。
 */
type NavItem = { id: SectionId; label: string; icon: typeof Map };
const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "学习",
    items: [
      { id: "learning", label: "学习地图", icon: Map },
      { id: "chat", label: "苏格拉底对话", icon: MessageSquare },
      { id: "challenge", label: "每日挑战赛", icon: Trophy },
    ],
  },
  {
    title: "创作",
    items: [
      { id: "works", label: "作品工厂", icon: FileText },
    ],
  },
  {
    title: "成长",
    items: [{ id: "profile", label: "能力雷达", icon: Radar }],
  },
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
        className="fixed left-3 top-3 z-50 w-8 h-8 rounded-md border border-app-border bg-app-surface flex items-center justify-center text-app-t3 hover:text-blue-600 hover:border-blue-300 shadow-sm transition duration-150 ease-in-out"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    );
  }

  /* ===== 展开态 ===== */
  return (
    <aside className="sticky top-0 h-screen w-60 shrink-0 bg-app-chrome border-r border-app-border flex flex-col">
      {/* 品牌区：Linear 渐变刊徽 + 字标（折叠按钮独立占位） */}
      <div className="h-[68px] px-3 border-b border-app-border flex items-center gap-2.5 shrink-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-white shadow-[0_4px_14px_-2px_rgba(94,106,210,0.55)]"
          style={{ background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)" }}
        >
          <span className="font-display text-[15px] font-bold leading-none">S</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold text-app-fg leading-none tracking-tight truncate">Spark</p>
          <p className="text-[10px] text-app-t4 mt-1 truncate tracking-wide">学习工作台</p>
        </div>
        <button
          onClick={toggleSidebar}
          title="折叠导航栏"
          className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-border/60 transition duration-150 ease-in-out"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 分组导航：选中指示条用 layoutId 平滑滑动 */}
      <nav className="px-2 py-2 flex-1 min-h-0 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-medium tracking-[0.16em] text-app-t4">
              {group.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`group wb-nav-item ${isActive ? "wb-nav-item-active" : ""}`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-indicator"
                        className="absolute left-1.5 top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-full bg-blue-500"
                        transition={{ type: "spring", stiffness: 420, damping: 32 }}
                      />
                    )}
                    <Icon
                      className={`w-4 h-4 shrink-0 transition-all duration-200 ease-out ${
                        isActive ? "text-blue-600" : "text-app-t3 group-hover:text-blue-600 group-hover:translate-x-[2px]"
                      }`}
                    />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 今日任务 */}
      <TaskList />

      {/* 底部：用户卡 + 退出 + 版本号 */}
      <div className="px-2 pb-2 pt-1 mt-auto border-t border-app-border">
        <div className="flex items-center gap-2.5 rounded-xl border border-app-border bg-app-surface px-2.5 py-2 mb-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
          <Avatar className="w-8 h-8 shrink-0">
            <AvatarFallback className="bg-blue-50 text-blue-600 font-medium">
              {user?.username?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-app-fg truncate">{user?.username ?? "学习者"}</p>
            <p className="text-[11px] text-app-t4 truncate">连续 {user?.streakDays ?? 0} 天</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-app-t3 hover:bg-app-surface hover:border-app-border hover:border transition duration-150 ease-in-out"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
        <p className="pb-0.5 pt-1 text-center text-[10px] tracking-wide text-app-t4">Spark v2.0</p>
      </div>
    </aside>
  );
}