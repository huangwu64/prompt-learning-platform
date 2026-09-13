import { useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * 弹窗骨架：遮罩 + 面板 + Esc 关闭 + 锁背景滚动。
 *
 * 从 `pages/works/components/PromptModals.tsx` 的文件内私有实现提取而来
 * （原先未导出，无法复用），并在提取时修掉一个隐患：滚动锁改为模块级计数，
 * 否则同时叠开两个弹窗时，先关闭的那一层会把背景滚动提前解锁。
 */

let lockCount = 0;
let previousOverflow = "";

function lockScroll() {
  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
  }
}

export interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  /** 底部操作区（可选）。放在这里而不是页面里，才能固定在面板底部不随内容滚动 */
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-2xl",
}: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} bg-app-surface rounded-2xl border border-app-border shadow-[0_24px_80px_-16px_rgba(20,20,60,0.35)] flex flex-col max-h-[90vh]`}
      >
        {/* 头部 */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-app-border shrink-0">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-medium tracking-tight text-app-fg truncate">
              {title}
            </h2>
            {subtitle && <p className="text-xs text-app-t4 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 overflow-y-auto min-h-0 flex-1">{children}</div>

        {/* 底部操作区 */}
        {footer && (
          <div className="px-6 py-4 border-t border-app-border shrink-0 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
