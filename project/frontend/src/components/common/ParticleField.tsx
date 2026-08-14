import { useEffect, useRef } from "react";

/**
 * 粒子背景（仿 TRAE 官网）：
 * 靛蓝细小光点缓慢漂浮 + 呼吸透明度 + 极淡连线，低调不干扰内容。
 * 支持 prefers-reduced-motion（降级为静态单帧）。
 */
export function ParticleField({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const LINK_DIST = 90; // 连线距离（CSS 像素）
    let raf = 0;
    let particles: { x: number; y: number; vx: number; vy: number; r: number; alpha: number; phase: number }[] = [];

    const makeParticles = () => {
      const w = canvas.width;
      const h = canvas.height;
      const count = Math.min(80, Math.max(28, Math.floor((w * h) / 22000)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28 * DPR,
        vy: (Math.random() - 0.5) * 0.28 * DPR,
        r: (Math.random() * 1.4 + 0.6) * DPR,
        alpha: Math.random() * 0.45 + 0.18,
        phase: Math.random() * Math.PI * 2,
      }));
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
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -12) p.x = w + 12;
        else if (p.x > w + 12) p.x = -12;
        if (p.y < -12) p.y = h + 12;
        else if (p.y > h + 12) p.y = -12;
        const breathe = 0.55 + 0.45 * Math.sin(t / 1400 + p.phase);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(75, 63, 227, ${(p.alpha * breathe).toFixed(3)})`;
        ctx.fill();
      }
      const dMax = LINK_DIST * DPR;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
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

    const tick = (t: number) => {
      drawFrame(t);
      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener("resize", resize);
    if (!reduce) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
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