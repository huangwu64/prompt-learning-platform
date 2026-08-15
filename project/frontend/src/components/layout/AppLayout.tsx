import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { ParticleField } from "@/components/common/ParticleField";

/**
 * 整体布局：
 * 左侧导航 + 顶部工具条 + 右侧内容区（DeepSeek 品牌动态背景：
 * 氛围渐变 + 漂移光斑 + 视差粒子，内容在独立层级之上）。
 */
export function AppLayout() {
  return (
    <div className="min-h-screen wb-bg flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 min-w-0 wb-canvas">
          {/* 动态背景层（固定视口，不随内容滚动） */}
          <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <span className="wb-glow wb-glow--1" />
            <span className="wb-glow wb-glow--2" />
            <span className="wb-glow wb-glow--3" />
            <ParticleField />
          </div>
          {/* 内容层 */}
          <div className="relative z-10 h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
