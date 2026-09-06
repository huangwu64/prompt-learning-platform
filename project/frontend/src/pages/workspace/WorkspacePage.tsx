import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "@/store/uiStore";
import LearningMapPage from "@/pages/learning/LearningMapPage";
import ChatPage from "@/pages/chat/ChatPage";
import WorksPage from "@/pages/works/WorksPage";
import ChallengePage from "@/pages/challenge/ChallengePage";
import ProfilePage from "@/pages/profile/ProfilePage";

/**
 * 右侧模块区：
 * 一次只显示一个模块，点击左侧导航切换显示（不拼接、无路由跳转）。
 * 切换时带淡入动画。
 */
export default function WorkspacePage() {
  const activeSection = useUiStore((s) => s.activeSection);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeSection}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col"
      >
        {activeSection === "learning" && <LearningMapPage />}
        {activeSection === "chat" && (
          <div className="h-[calc(100vh-120px)] min-h-[640px]">
            <ChatPage />
          </div>
        )}
        {activeSection === "works" && <WorksPage />}
        {activeSection === "challenge" && <ChallengePage />}
        {activeSection === "profile" && <ProfilePage />}
      </motion.div>
    </AnimatePresence>
  );
}
