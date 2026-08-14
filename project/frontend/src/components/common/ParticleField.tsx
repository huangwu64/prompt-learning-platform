import { useEffect, useRef } from "react";

/**
 * 景深粒子背景（仿 TRAE 官网，多层视差）：
 * 远 / 中 / 近 三层粒子，近层更大、更快、更亮；鼠标移动时各层按景深系数位移形成视差。
 * 支持 prefers-reduced-motion（降级为静态单帧）。
 */
type Layer = {
  depth: number;      // 景深系数：越大越近
  count: number;
  rMin: number; rMax: number;
  aMin: number; aMax: number;
  speed: number;      // 自飘速度
  color: string;      // "r, g, b"
};

const LAYERS: Layer[] = [
  { depth: 0.25, count: 26, rMin: 0.6, rMax: 1.4, aMin: 0.13, aMax: 0.36, speed: 0.16, color: "75, 63, 227" },
  { depth: 0.6,  count: 22, rMin: 1.2, rMax: 2.2, aMin: 0.2,  aMax: 0.48, speed: 0.32, color: "75, 63, 227" },
  { depth: 1,    count: 15, rMin: 2.0, rMax: 3.4, aMin: 0.26, aMax: 0.55, speed: 0.6,  color: "75, 63, 227" },
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
    const LINK_DIST = 88;
    let raf = 0;
    let particles: Particle[] = [];
    const mouse = { nx: 0, ny: 0 }; // 归一化 -0.5..0.5

    const makeParticles = () => {
      const w = canvas.width;
      const h = canvas.height;
      particles = [];
      for (const layer of LAYERS) {
        for (let i = 0; i < layer.count; i++) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() * layer.speed + 0.05) * dir * DPR,
            vy: (Math.random() * layer.speed + 0.05) * (Math.random() < 0.5 ? 1 : -1) * DPR,
            r: (layer.rMin + Math.random() * (layer.rMax - layer.rMin)) * DPR,
            alpha: layer.aMin + Math.random() * (layer.aMax - layer.aMin),
            phase: Math.random() * Math.PI * 2,
            layer,
            color: Math.random() < 0.18 && layer.depth === 1 ? "0, 185, 131" : layer.color,
          });
        }
      }
    };

    const resize = () => {
      canvas.width = canvas.offsetWidth * DPR;
      canvas.height = canvas.offsetHeight * DPR;
      makeParticles();
      if (reduce) drawFrame(0);
    };

    const drawFrame = (t: number) => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      // 视差偏移：近层随鼠标移动更多
      const px = mouse.nx * 44 * DPR;
      const py = mouse.ny * 34 * DPR;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -14) p.x = w + 14;
        else if (p.x > w + 14) p.x = -14;
        if (p.y < -14) p.y = h + 14;
        else if (p.y > h + 14) p.y = -14;
        const ox = p.x + px * p.layer.depth;
        const oy = p.y + py * p.layer.depth;
        const breathe = 0.55 + 0.45 * Math.sin(t / 1400 + p.phase);
        ctx.beginPath();
        ctx.arc(ox, oy, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${(p.alpha * breathe).toFixed(3)})`;
        ctx.fill();
      }

      const dMax = LINK_DIST * DPR;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          if (particles[i].layer !== particles[j].layer) continue; // 仅同层连线
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < dMax * dMax) {
            const d = Math.sqrt(d2);
            ctx.strokeStyle = `rgba(75, 63, 227, ${(0.05 * (1 - d / dMax)).toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
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

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
    />
  );
}