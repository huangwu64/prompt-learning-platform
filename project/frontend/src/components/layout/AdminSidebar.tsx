import { Link, NavLink, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, ImageUp, LogOut, ScrollText, Settings2, Users } from "lucide-react";
import { SparkLogo } from "@/components/chat/SparkLogo";
import { useAuthStore } from "@/store/authStore";

/** 后台导航。顺序按使用频率：概览 → 日常操作 → 运维配置 */
const NAV_ITEMS = [
  { to: "/admin/monitor", label: "监控", icon: Activity },
  { to: "/admin/avatars", label: "头像审核", icon: ImageUp },
  { to: "/admin/users", label: "用户管理", icon: Users },
  { to: "/admin/config", label: "API 配置", icon: Settings2 },
  { to: "/admin/logs", label: "日志", icon: ScrollText },
];

export function AdminSidebar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 flex flex-col bg-app-chrome border-r border-app-border">
      {/* 品牌区 */}
      <div className="px-5 py-5 flex items-center gap-3">
        <SparkLogo size={34} />
        <div className="min-w-0">
          <p className="font-display text-base font-medium tracking-tight text-app-fg leading-tight">
            Spark
          </p>
          <p className="text-[11px] text-app-t4">管理后台</p>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `wb-nav-item ${isActive ? "wb-nav-item-active" : ""}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* 底部：当前账号 + 返回工作台 + 退出 */}
      <div className="px-2 pb-3 pt-2 mt-auto border-t border-app-border">
        <div className="flex items-center gap-2.5 rounded-xl border border-app-border bg-app-surface px-2.5 py-2 mb-1.5">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-app-fg truncate">{user?.username ?? "管理员"}</p>
            <p className="text-[11px] text-app-t4">管理员</p>
          </div>
        </div>

        <Link
          to="/app"
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-app-t2 hover:bg-app-chrome hover:text-app-fg transition"
        >
          <ArrowLeft className="w-4 h-4" />
          返回工作台
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-app-t2 hover:bg-app-chrome hover:text-app-fg transition"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>
      </div>
    </aside>
  );
}
