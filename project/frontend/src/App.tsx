import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AuthGuard } from "@/components/common/AuthGuard";
import { AdminGuard } from "@/components/common/AdminGuard";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// Pages
import LoginPage from "@/pages/auth/LoginPage";
import WorkspacePage from "@/pages/workspace/WorkspacePage";
import LandingPage from "@/pages/landing/LandingPage";
import AdminAvatarsPage from "@/pages/admin/AdminAvatarsPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminConfigPage from "@/pages/admin/AdminConfigPage";
import AdminMonitorPage from "@/pages/admin/AdminMonitorPage";
import AdminLogsPage from "@/pages/admin/AdminLogsPage";

/** 根地址 / 入口：一律先进宣传页（登录与否都由宣传页 → 登录 → 工作台走流程） */
function RootRedirect() {
  return <Navigate to="/landing" replace />;
}

/**
 * 单页面应用（各页独立地址）：
 * - /landing 宣传页（公开）：输入根地址 / 自动落位于此
 * - /login   登录/注册（公开）
 * - /app     主工作台（受保护，未登录跳 /login）：左侧固定导航 + 模块内容区
 * - 兜底（未知路径）→ 走根地址重定向
 */
/**
 * 路由表（各页独立地址）：
 * - /         根地址 → 一律重定向到 /landing
 * - /landing  宣传页（公开）
 * - /login    登录/注册（公开）
 * - /app      主工作台（受保护，未登录跳 /login）
 *
 * 视觉体系：**浅色靛蓝** —— 底 #F6F7F9 / 白卡 #FFFFFF / 主文字 #171717 /
 * 品牌靛蓝 #4B3FE3（hover #3D31D6、亮阶 #6B5BFF）/ 语义绿 #00B983；
 * 标题用衬线 Noto Serif SC，正文 Outfit。与宣传页共用同一套设计语言，
 * 宣传页是视觉权威，详见 DESIGN.md。
 *
 * 背景层 = .wb-canvas 点阵网格 + 三色漂移光斑（靛蓝/亮靛/语义绿）+ 视差粒子场，
 * 全部尊重 prefers-reduced-motion。
 */
export default function App() {
  // 磁性按钮：鼠标靠近时轻微吸附（宣传页同款动效）
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest?.(".magnetic") as HTMLElement | null;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.25;
      btn.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    };
    const onLeave = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest?.(".magnetic") as HTMLElement | null;
      if (btn) btn.style.transform = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseout", onLeave);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <BrowserRouter>
      {/* 顶层兜底：任何未被子边界捕获的渲染异常，都不该让用户面对一片空白 */}
      <ErrorBoundary>
      <Routes>
        {/* 根地址：一律进宣传页 /landing（经登录后再进工作台） */}
        <Route path="/" element={<RootRedirect />} />

        {/* 宣传页（公开） */}
        <Route path="/landing" element={<LandingPage />} />

        {/* 登录/注册（公开） */}
        <Route path="/login" element={<LoginPage />} />

        {/* 工作台（受保护，未登录自动跳 /login） */}
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/app" element={<WorkspacePage />} />
        </Route>

        {/* 管理后台（仅 ADMIN；非管理员看到 403 面板而非静默跳转） */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<Navigate to="/admin/monitor" replace />} />
          <Route path="monitor" element={<AdminMonitorPage />} />
          <Route path="avatars" element={<AdminAvatarsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="config" element={<AdminConfigPage />} />
          <Route path="logs" element={<AdminLogsPage />} />
        </Route>

        {/* 兜底：未知路径走根地址重定向 */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
