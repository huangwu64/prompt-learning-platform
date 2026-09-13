import { useLocation } from "react-router-dom";
import { Activity, ImageUp, ScrollText, Settings2, Users } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { UserAvatar } from "@/components/common/UserAvatar";

/** 路径 → 页面名，与侧栏导航保持一致 */
const PAGE_TITLES: Record<string, { label: string; icon: typeof ImageUp }> = {
  "/admin/monitor": { label: "监控", icon: Activity },
  "/admin/avatars": { label: "头像审核", icon: ImageUp },
  "/admin/users": { label: "用户管理", icon: Users },
  "/admin/config": { label: "API 配置", icon: Settings2 },
  "/admin/logs": { label: "日志", icon: ScrollText },
};

export function AdminTopBar() {
  const { pathname } = useLocation();
  const user = useAuthStore((s) => s.user);

  const meta = PAGE_TITLES[pathname] ?? { label: "管理后台", icon: Activity };
  const Icon = meta.icon;

  return (
    <header className="h-14 shrink-0 sticky top-0 z-30 bg-app-surface/60 backdrop-blur-md border-b border-app-border flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-sm font-semibold text-app-fg whitespace-nowrap font-display tracking-tight">
          Spark
        </span>
        <span className="text-app-borderStrong">/</span>
        <span className="flex items-center gap-1.5 text-sm text-app-t3 truncate">
          <Icon className="w-4 h-4 text-blue-600" />
          {meta.label}
        </span>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <span className="text-xs text-app-t3 hidden sm:inline">{user?.username}</span>
        <UserAvatar
          src={user?.avatar}
          name={user?.username}
          className="w-7 h-7"
          fallbackClassName="text-xs"
        />
      </div>
    </header>
  );
}
