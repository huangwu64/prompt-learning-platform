import { motion } from "framer-motion";

/**
 * Spark 品牌头像：三色渐变圆底 + 白色火花图形（品牌 favicon 同款路径），
 * 替代泛化的"AI"字样圆形图标。
 */
export function SparkLogo({ size = 36, animate = true }: { size?: number; animate?: boolean }) {
  return (
    <motion.span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-white"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #4B3FE3, #6B5BFF 60%, #7A6FF0)",
        boxShadow: "0 4px 14px -2px rgba(94,106,210,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
      animate={animate ? { scale: [1, 1.05, 1] } : undefined}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" width={size * 0.5} height={size * 0.5} fill="currentColor">
        <path d="M16 2 L19.4 12.6 L30 16 L19.4 19.4 L16 30 L12.6 19.4 L2 16 L12.6 12.6 Z" />
      </svg>
    </motion.span>
  );
}
