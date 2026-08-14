import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/**
 * 整体布局（模仿 WorkBuddy 工作台）：
 * 左侧会话栏 + 顶部工具条 + 右侧内容区，全部浅色。
 */
export function AppLayout() {
  return (
    <div className="min-h-screen wb-bg flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
