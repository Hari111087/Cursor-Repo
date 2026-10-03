"use client";
import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/** Glassmorphism card that fades + slides in. */
export function Card({ className, delay = 0, ...props }: HTMLMotionProps<"div"> & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass relative overflow-hidden rounded-lg p-5 shadow-[0_8px_32px_rgba(0,0,0,0.18)]", className)}
      {...props}
    />
  );
}

export function CardHeader({ className, icon, title, action, subtitle }: { className?: string; icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5">
        {icon && <span className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan/10 text-cyan [&_svg]:size-4">{icon}</span>}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/90">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
