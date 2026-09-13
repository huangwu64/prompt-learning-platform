import { ParticleField } from "@/components/common/ParticleField";

/**
 * 固定视口的品牌动态背景层（三色漂移光斑 + 视差粒子）。
 *
 * AppLayout 与 AdminLayout 共用 —— 后台要与工作台视觉一致，但不应各自
 * 维护一份，否则改一处忘一处就会分叉。
 */
export function BackgroundLayer() {
  return (
    <div aria-hidden className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <span className="wb-glow wb-glow--1" />
      <span className="wb-glow wb-glow--2" />
      <span className="wb-glow wb-glow--3" />
      <ParticleField />
    </div>
  );
}
