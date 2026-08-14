import { useEffect, useRef } from "react";

/**
 * 景深粒子背景（仿 TRAE 官网，多层视差）：
 * 远 / 中 / 近 三层粒子，近层更大、更快、更亮；鼠标移动时各层按景深系数位移形成视差。
 * 无连线、低速稀疏，铺满全屏不显杂乱。支持 prefers-reduced-motion（静态单帧）。
 */
type Layer = {
  depth: number;
  count: number;
  rMin: number; rMax: number;
  aMin: number; aMax: number;
  speed: number;
  color: string;
};

const LAYERS: Layer[] = [
  { depth: 0.25, count: 26, rMin: 0.8, rMax: 1.5, aMin: 0.15, aMax: 0.32, speed: 0.12, color: "75, 63, 227" },
  { depth: 0.6,  count: 20, rMin: 1.2, rMax: 2.0, aMin: 0.2,  aMax: 0.4,  speed: 0.2,  color: "75, 63, 227" },
  { depth: 1,    count: 12, rMin: 1.8, rMax: 2.8, aMin: 0.24, aMax: 0.45, speed: 0.32, color: "75, 63, 227" },
];

type Particle = {
  x: number; y: number; vx: number; vy: number;
  r: number; alpha: number; phase: number;
  layer: Layer; color: string;
};

export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let raf = 0;
    let particles: Particle[] = [];
    const mouse = { nx: 0, ny: 0 };

    const makeParticles = () => {
      const w = canvas.width;
      const h = canvas.height;
      particles = [];
      for (const layer of LAYERS) {
        for (let i = 0; i < layer.count; i++) {
          const dirX = Math.random() < 0.5 ? 1 : -1;
          const dirY = Math.random() < 0.5 ? 1 : -1;
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() * layer.speed + 0.04) * dirX * DPR,
            vy: (Math.random() * layer.speed + 0.04) * dirY * DPR,
            r: (layer.rMin + Math.random() * (layer.rMax - layer.rMin)) * DPR,
            alpha: layer.aMin + Math.random() * (layer.aMax - layer.aMin),
            phase: Math.random() * Math.PI * 2,
            layer,
            color: Math.random() < 0.15 && layer.depth === 1 ? "0, 185, 131" : layer.color,
          });
        }
      }
    };

    const resize = () => {
      // 等布局完成后再测量，确保铺满全屏
      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : window.innerWidth;
      const h = rect.height > 0 ? rect.height : window.innerHeight;
      canvas.width = w * DPR;
      canvas.height = h * DPR;
      makeParticles();
      if (reduce) drawFrame(0);
    };

    const drawFrame = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const px = mouse.nx * 40 * DPR;
      const py = mouse.ny * 30 * DPR;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -16) p.x = w + 16;
        else if (p.x > w + 16) p.x = -16;
        if (p.y < -16) p.y = h + 16;
        else if (p.y > h + 16) p.y = -16;
        const ox = p.x + px * p.layer.depth;
        const oy = p.y + py * p.layer.depth;
        const breathe = 0.6 + 0.4 * Math.sin(t / 1600 + p.phase);
        ctx.beginPath();
        ctx.arc(ox, oy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${(p.alpha * breathe).toFixed(3)})`;
        ctx.fill();
      }
    };

    const onMove = (e: MouseEvent) => {
      mouse.nx = e.clientX / window.innerWidth - 0.5;
      mouse.ny = e.clientY / window.innerHeight - 0.5;
    };

    const tick = (t: number) => {
      drawFrame(t);
      raf = requestAnimationFrame(tick);
    };

    // 布局稳定后再测量（rAF 双保险）
    const init = () => {
      resize();
      window.addEventListener("resize", resize);
      window.addEventListener("mousemove", onMove);
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    const rafInit = requestAnimationFrame(init);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(rafInit);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
    />
  );
}