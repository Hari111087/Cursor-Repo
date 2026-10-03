"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const LABEL: Record<OrbState, string> = { idle: "Online", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking" };

/** Arc-reactor style core. Breathes when idle, ripples when listening, spins when thinking. */
export function Orb({ state = "idle", size = 220, onClick, className }: { state?: OrbState; size?: number; onClick?: () => void; className?: string }) {
  const active = state !== "idle";
  const spin = state === "thinking" ? 3 : 18;
  const core = state === "listening" ? "#FF2E97" : state === "thinking" ? "#8B5CF6" : "#00E5FF";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Assistant core: ${LABEL[state]}. ${onClick ? "Activate voice input" : ""}`}
      className={cn("group relative flex items-center justify-center rounded-full outline-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Outer ripples while listening / speaking */}
      <AnimatePresence>
        {(state === "listening" || state === "speaking") &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: core }}
              initial={{ scale: 0.6, opacity: 0.6 }}
              animate={{ scale: 1.35, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.66, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="35%" stopColor={core} stopOpacity="0.9" />
            <stop offset="100%" stopColor={core} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="orb-ring" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#00E5FF" />
            <stop offset="50%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#FF2E97" />
          </linearGradient>
          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ticked outer ring */}
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: 360 }} transition={{ duration: spin * 2, repeat: Infinity, ease: "linear" }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <line key={i} x1="100" y1="4" x2="100" y2={i % 5 === 0 ? 12 : 8} stroke="url(#orb-ring)" strokeOpacity={i % 5 === 0 ? 0.9 : 0.35} strokeWidth="1.2" transform={`rotate(${i * 6} 100 100)`} />
          ))}
        </motion.g>

        {/* Segmented arcs */}
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: -360 }} transition={{ duration: spin, repeat: Infinity, ease: "linear" }} filter="url(#orb-glow)">
          <circle cx="100" cy="100" r="78" fill="none" stroke="url(#orb-ring)" strokeWidth="2.5" strokeDasharray="60 22 18 22" strokeLinecap="round" opacity="0.9" />
        </motion.g>
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: 360 }} transition={{ duration: spin * 0.7, repeat: Infinity, ease: "linear" }}>
          <circle cx="100" cy="100" r="64" fill="none" stroke="#00E5FF" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 6" />
        </motion.g>

        {/* Arc-reactor spokes */}
        <g opacity="0.85" filter="url(#orb-glow)">
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x="96" y="48" width="8" height="16" rx="2" fill={core} fillOpacity="0.55" transform={`rotate(${i * 36} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r="40" fill="none" stroke={core} strokeWidth="2" strokeOpacity="0.8" />
        </g>

        {/* Breathing core */}
        <motion.circle
          cx="100"
          cy="100"
          r={30}
          fill="url(#orb-core)"
          initial={{ r: 30 }}
          animate={{ r: active ? [30, 38, 30] : [28, 33, 28], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: state === "thinking" ? 0.9 : active ? 1.2 : 3.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      <motion.div
        aria-hidden
        className="absolute inset-[18%] rounded-full blur-2xl"
        style={{ background: core }}
        animate={{ opacity: active ? [0.25, 0.45, 0.25] : [0.12, 0.22, 0.12] }}
        transition={{ duration: active ? 1.2 : 3.6, repeat: Infinity }}
      />
      <span className="absolute -bottom-7 font-display text-[10px] uppercase tracking-[0.3em] text-cyan/80 glow-text">{LABEL[state]}</span>
    </button>
  );
}
