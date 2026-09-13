import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";
import { BackgroundLayer } from "./BackgroundLayer";
import { FloatingBubble } from "@/components/assistant/FloatingBubble";
import { AssistantDrawer } from "@/components/assistant/AssistantDrawer";

/**
 * 管理后台布局。
 *
 * 结构与 AppLayout 同构（左栏 + 顶栏 + 内容区 + 背景层），但**不复用 AppLayout** ——
 * 后者绑定了 Sidebar 的 5 个 SectionId 与 uiStore。共用的是 BackgroundLayer，
 * 保证两边视觉不分叉。
 *
 * 助手（气泡 + 抽屉）同样挂在这里：管理员也是登录用户，随处可用。
 */
export function AdminLayout() {
  return (
    <div className="min-h-screen wb-bg flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminTopBar />
        <main className="flex-1 min-w-0 wb-canvas">
          <BackgroundLayer />
          <div className="relative z-10 h-full">
            <Outlet />
          </div>
        </main>
      </div>

      <FloatingBubble />
      <AssistantDrawer />
    </div>
  );
}
