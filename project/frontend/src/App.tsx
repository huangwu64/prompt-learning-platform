import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { AuthGuard } from "@/components/common/AuthGuard";

// Pages
import LoginPage from "@/pages/auth/LoginPage";
import WorkspacePage from "@/pages/workspace/WorkspacePage";

/**
 * 单页面应用：
 * - 登录页 /login
 * - 主页面 /：左侧固定导航 + 右侧单页展示全部模块内容（滚动浏览）
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
      <Routes>
        {/* 登录（公开） */}
        <Route path="/login" element={<LoginPage />} />

        {/* 主页面（受保护） */}
        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="/" element={<WorkspacePage />} />
        </Route>

        {/* 兜底 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
