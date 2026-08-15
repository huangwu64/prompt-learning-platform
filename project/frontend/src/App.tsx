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
/**
 * Spark 工作台 — 方向契约（Linear 设计语言，established-world 精修）
 *
 * THESIS: 工作台采用 Linear 级设计——近黑底 #08090A、青绿→蓝紫→紫三色渐变
 *   （#00B983→#4B3FE3→#7A6FF0）、渐变发光边框、卡片顶部内光晕、玻璃质感、
 *   点阵网格背景、精修排版；拒绝 AI 生成俗套（米白衬线、浅灰卡、大数字+细线）。
 * OWN-WORLD: Linear 色板 + wb-card 玻璃表面（顶部内光晕 + 深投影）+ wb-border-grad
 *   渐变发光边框 + wb-reveal 滚动渐入 + 三色漂移光斑 + 视差粒子场。
 * STORY: 用户进入深色科技工作台：发光导航指示条引导模块，卡片 hover 泛出蓝紫光，
 *   进度横幅青绿→蓝紫渐变，数据精修排版。
 * FIRST VIEWPORT: 左侧 240px 深色侧栏（渐变刊徽 + 发光导航 + 今日任务 + 用户卡）+
 *   顶部 56px 毛玻璃工具条 + 内容区点阵网格与三色光晕；首屏学习地图时间线。
 * FORM: Linear 设计语言在工作台的全表面实现。
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the
 *   finish review, the verdict, DESIGN.md, and every shipping raster carrying
 *   its provenance.
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
