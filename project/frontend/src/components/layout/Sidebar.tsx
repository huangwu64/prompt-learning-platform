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
 * 左侧导航栏（impeccable Operate 排版升级）：
 * 品牌区 + 分组导航（学习/创作/成长）+ 今日任务 + 用户卡片。
 */
type NavItem = { id: SectionId; label: string; icon: typeof Map; core?: boolean };
const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: "学习",
    items: [
      { id: "learning", label: "学习地图", icon: Map },
      { id: "chat", label: "苏格拉底对话", icon: MessageSquare, core: true },
      { id: "challenge", label: "提示词挑战赛", icon: Trophy },
    ],
  },
  {
    title: "创作",
    items: [
      { id: "works", label: "作品工厂", icon: FileText },
      { id: "lab", label: "提示词实验室", icon: FlaskConical },
    ],
  },
  {
    title: "成长",
    items: [{ id: "profile", label: "AI 能力雷达", icon: Radar }],
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
        className="fixed left-3 top-3 z-50 w-8 h-8 rounded-md border border-[#E5E6EA] bg-white flex items-center justify-center text-[#737373] hover:text-blue-600 hover:border-blue-300 shadow-sm transition duration-150 ease-in-out"
      >
        <PanelLeftOpen className="w-4 h-4" />
      </button>
    );
  }

  /* ===== 展开态 ===== */
  return (
    <aside className="sticky top-0 h-screen w-60 shrink-0 bg-[#F0F1F4] border-r border-[#E5E6EA] flex flex-col">
      {/* 品牌区：衬线字标 + 副标（呼应登录页出版感） */}
      <div className="h-16 px-4 border-b border-[#E5E6EA] flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <p className="font-display text-[17px] font-semibold text-[#171717] leading-none tracking-tight">Spark</p>
          <p className="text-[10px] text-[#A0A0A8] mt-1.5 truncate tracking-wide">提示词工程学习平台</p>
        </div>
        <button
          onClick={toggleSidebar}
          title="折叠导航栏"
          className="w-7 h-7 shrink-0 rounded-md flex items-center justify-center text-[#A0A0A8] hover:text-[#171717] hover:bg-[#E5E6EA]/60 transition duration-150 ease-in-out"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 分组导航 */}
      <nav className="px-2 py-2 flex-1 min-h-0 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-2">
            <p className="px-3 pt-2 pb-1 text-[10px] font-medium tracking-[0.14em] text-[#A0A0A8]">
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
                    className={`wb-nav-item ${isActive ? "wb-nav-item-active" : ""}`}
                  >
                    <Icon className={`w-4 h-4 transition-transform duration-200 ease-out ${isActive ? "text-blue-600 scale-110" : ""}`} />
                    {item.label}
                    {item.core && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 今日任务 */}
      <TaskList />

      {/* 底部：用户卡片 + 退出 */}
      <div className="px-2 pb-2 pt-1 mt-auto border-t border-[#E5E6EA]">
        <div className="flex items-center gap-2.5 rounded-xl border border-[#E5E6EA] bg-white px-2.5 py-2 mb-1.5">
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
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#737373] hover:bg-white hover:border-[#E5E6EA] hover:border transition duration-150 ease-in-out"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}