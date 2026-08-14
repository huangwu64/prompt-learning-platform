import { useEffect, useRef, useState } from "react";

/** 数字滚动动画（状态反馈：数据就位时滚动到目标值；prefers-reduced-motion 直接显示） */
export function CountUp({
  value,
  decimals = 0,
  duration = 700,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const reduceRef = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const rafRef = useRef(0);

  useEffect(() => {
    if (reduceRef.current) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(value * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}