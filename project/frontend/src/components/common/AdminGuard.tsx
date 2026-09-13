import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

/**
 * 管理后台守卫：未登录跳登录页；已登录但非管理员渲染 403 面板。
 *
 * 刻意**不做静默重定向** —— 否则「角色没生效」这类配置问题会表现为
 * 「点了没反应」，很难排查。明确告知无权限更利于发现问题。
 *
 * 注意这只是前端的入口收敛，不是安全边界：真正的鉴权在后端
 * （SecurityConfig 的 /api/admin/** hasRole("ADMIN")）。
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="min-h-screen wb-canvas flex items-center justify-center px-6">
        <div className="wb-card max-w-md w-full flex flex-col items-center text-center gap-3">
          <span className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-5 h-5" />
          </span>
          <p className="text-base font-medium text-app-fg">无权访问管理后台</p>
          <p className="text-sm text-app-t3 leading-relaxed">
            当前账号不是管理员。如果你认为这是误判，请联系管理员确认角色配置。
          </p>
          <Link to="/app" className="wb-btn wb-btn-primary mt-1">
            <ArrowLeft className="w-4 h-4" />
            返回工作台
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
