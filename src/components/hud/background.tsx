"use client";
import { useEffect, useRef } from "react";

/** Animated HUD grid + drifting particle field. Pauses when the tab is hidden and respects reduced motion. */
export function HudBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const colors = ["0,229,255", "139,92,246", "255,46,151"];
    type P = { x: number; y: number; vx: number; vy: number; r: number; c: string; a: number };
    let ps: P[] = [];

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(70, Math.floor((w * h) / 22000));
      ps = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.15, vy: (Math.random() - 0.5) * 0.15,
        r: Math.random() * 1.6 + 0.4, c: colors[Math.floor(Math.random() * 3)], a: Math.random() * 0.5 + 0.2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const light = document.documentElement.classList.contains("light");
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.x = (p.x + p.vx + w) % w;
        p.y = (p.y + p.vy + h) % h;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.c},${light ? p.a * 0.5 : p.a})`;
        ctx.fill();
        for (let j = i + 1; j < ps.length; j++) {
          const q = ps[j];
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 110) {
            ctx.strokeStyle = `rgba(0,229,255,${(1 - d / 110) * (light ? 0.06 : 0.12)})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }
      }
      if (!reduce && document.visibilityState === "visible") raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      cancelAnimationFrame(raf);
      if (document.visibilityState === "visible") draw();
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="hud-grid absolute inset-0 animate-grid-pan [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]" />
      <div className="absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full bg-cyan/10 blur-[120px]" />
      <div className="absolute -bottom-40 -right-20 h-[520px] w-[520px] rounded-full bg-violet/10 blur-[140px]" />
      <div className="absolute right-1/3 top-1/3 h-[300px] w-[300px] rounded-full bg-magenta/5 blur-[120px]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
