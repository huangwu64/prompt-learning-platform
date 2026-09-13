import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useAssistantStore } from "@/store/assistantStore";

/**
 * 助手悬浮气泡（右下角）。
 *
 * 只挂在登录后的区域（AppLayout）—— 助手不给游客用，所以宣传页 /landing 与
 * 登录页 /login 上不会出现。
 */
export function FloatingBubble() {
  const open = useAssistantStore((s) => s.open);
  const openDrawer = useAssistantStore((s) => s.openDrawer);
  const reduceMotion = useReducedMotion();

  if (open) return null;

  return (
    <motion.button
      type="button"
      onClick={openDrawer}
      aria-label="打开 AI 助手"
      initial={reduceMotion ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
      className="fixed bottom-6 right-6 z-[80] h-14 w-14 rounded-full text-white flex items-center justify-center transition-shadow duration-200 hover:shadow-[0_14px_38px_-6px_rgba(75,63,227,0.62)]"
      style={{
        background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)",
        boxShadow: "0 10px 30px -6px rgba(75,63,227,0.5), inset 0 1px 0 rgba(255,255,255,0.28)",
      }}
    >
      <Sparkles className="w-6 h-6" />
    </motion.button>
  );
}
