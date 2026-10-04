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
    const colors = ["46,230,230", "46,230,230", "255,138,31", "255,255,255"];
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
        r: Math.random() * 1.6 + 0.4, c: colors[Math.floor(Math.random() * colors.length)], a: Math.random() * 0.5 + 0.2,
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
            ctx.strokeStyle = `rgba(46,230,230,${(1 - d / 110) * (light ? 0.06 : 0.12)})`;
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
      <div className="hud-grid absolute inset-0 animate-grid-pan [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />
      {/* Edge light: teal on the left, reactor orange on the right */}
      <div className="absolute -left-40 top-1/4 h-[520px] w-[420px] rounded-full bg-cyan/10 blur-[120px]" />
      <div className="absolute -right-40 top-1/3 h-[520px] w-[420px] rounded-full bg-violet/10 blur-[130px]" />
      <div className="absolute inset-y-[12%] left-0 w-[2px] bg-gradient-to-b from-transparent via-cyan to-transparent opacity-70 shadow-[0_0_18px_4px_rgb(var(--cyan)/0.45)]" />
      <div className="absolute inset-y-[12%] right-0 w-[2px] bg-gradient-to-b from-transparent via-violet to-transparent opacity-70 shadow-[0_0_18px_4px_rgb(var(--violet)/0.45)]" />
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      <div className="scanlines absolute inset-0 opacity-60" />
    </div>
  );
}
