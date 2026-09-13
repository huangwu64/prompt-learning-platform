import { AnimatePresence, motion } from "framer-motion";
import { useUiStore } from "@/store/uiStore";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import LearningMapPage from "@/pages/learning/LearningMapPage";
import ChatPage from "@/pages/chat/ChatPage";
import WorksPage from "@/pages/works/WorksPage";
import ChallengePage from "@/pages/challenge/ChallengePage";
import ProfilePage from "@/pages/profile/ProfilePage";

/** 模块名，用于出错时给出可读的上下文 */
const SECTION_LABEL: Record<string, string> = {
  learning: "学习地图",
  chat: "苏格拉底对话",
  works: "作品工厂",
  challenge: "每日挑战赛",
  profile: "能力雷达",
};

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
        {/*
          模块级兜底：某个模块渲染出错时只替换该模块，左侧导航仍然可用。
          外层 motion.div 带 key={activeSection}，切走再切回会重建边界、自动清掉错误。
        */}
        <ErrorBoundary label={SECTION_LABEL[activeSection]}>
          {activeSection === "learning" && <LearningMapPage />}
          {activeSection === "chat" && (
            <div className="h-[calc(100vh-120px)] min-h-[640px]">
              <ChatPage />
            </div>
          )}
          {activeSection === "works" && <WorksPage />}
          {activeSection === "challenge" && <ChallengePage />}
          {activeSection === "profile" && <ProfilePage />}
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  );
}
