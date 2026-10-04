"use client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

const LABEL: Record<OrbState, string> = { idle: "Online", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking" };

const TEAL = "#2EE6E6";
const ORANGE = "#FF8A1F";
const RED = "#FF2A4D";

/**
 * Stark-HUD reactor: segmented teal outer ring, dotted track, orange ticked dial,
 * red arc accents and a reticle core. Breathes when idle, ripples when listening, spins when thinking.
 */
export function Orb({ state = "idle", size = 220, onClick, className }: { state?: OrbState; size?: number; onClick?: () => void; className?: string }) {
  const active = state !== "idle";
  const spin = state === "thinking" ? 4 : 30;
  const outer = state === "listening" ? RED : state === "thinking" ? ORANGE : TEAL;
  const showLabel = size >= 80;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Assistant core: ${LABEL[state]}. ${onClick ? "Activate voice input" : ""}`}
      className={cn("group relative flex items-center justify-center rounded-full outline-none", className)}
      style={{ width: size, height: size }}
    >
      {/* Sonar ripples while listening / speaking */}
      <AnimatePresence>
        {(state === "listening" || state === "speaking") &&
          [0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="absolute inset-0 rounded-full border"
              style={{ borderColor: outer }}
              initial={{ scale: 0.6, opacity: 0.6 }}
              animate={{ scale: 1.3, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.66, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>

      <motion.div
        aria-hidden
        className="absolute inset-[14%] rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${outer} 0%, ${ORANGE}55 55%, transparent 70%)` }}
        animate={{ opacity: active ? [0.22, 0.4, 0.22] : [0.1, 0.18, 0.1] }}
        transition={{ duration: active ? 1.2 : 4, repeat: Infinity }}
      />

      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full overflow-visible">
        <defs>
          <radialGradient id="orb-core" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="30%" stopColor={outer} stopOpacity="0.85" />
            <stop offset="100%" stopColor={outer} stopOpacity="0" />
          </radialGradient>
          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Red accent arcs (outermost) */}
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: -360 }} transition={{ duration: spin * 2.4, repeat: Infinity, ease: "linear" }}>
          <circle cx="100" cy="100" r="97" fill="none" stroke={RED} strokeOpacity="0.75" strokeWidth="1.2" strokeDasharray="34 120 12 140" />
          {[0, 120, 240].map((a) => (
            <circle key={a} cx="100" cy="3" r="2" fill="none" stroke={RED} strokeWidth="1" transform={`rotate(${a} 100 100)`} />
          ))}
        </motion.g>

        {/* Segmented outer ring */}
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: 360 }} transition={{ duration: spin, repeat: Infinity, ease: "linear" }} filter="url(#orb-glow)">
          <circle cx="100" cy="100" r="86" fill="none" stroke={outer} strokeWidth="7" strokeDasharray="26 6 8 6 40 10 14 8" opacity="0.95" />
        </motion.g>

        {/* Dotted track */}
        <g>
          {Array.from({ length: 24 }).map((_, i) => (
            <circle key={i} cx="100" cy="23" r="1.4" fill="#ffffff" fillOpacity={i % 3 === 0 ? 0.95 : 0.45} transform={`rotate(${i * 15} 100 100)`} />
          ))}
          <circle cx="100" cy="100" r="71" fill="none" stroke={TEAL} strokeOpacity="0.6" strokeWidth="1" />
        </g>

        {/* Orange ticked dial */}
        <motion.g style={{ originX: "100px", originY: "100px" }} animate={{ rotate: -360 }} transition={{ duration: spin * 1.6, repeat: Infinity, ease: "linear" }}>
          <circle cx="100" cy="100" r="60" fill="none" stroke={ORANGE} strokeOpacity="0.8" strokeWidth="1.2" />
          {Array.from({ length: 48 }).map((_, i) => (
            <line key={i} x1="100" y1="41" x2="100" y2={i % 4 === 0 ? 50 : 46} stroke={ORANGE} strokeOpacity={i % 4 === 0 ? 0.95 : 0.55} strokeWidth="1.1" transform={`rotate(${i * 7.5} 100 100)`} />
          ))}
        </motion.g>

        {/* Reticle */}
        <g stroke={TEAL} strokeOpacity="0.55" strokeWidth="0.8">
          <line x1="100" y1="58" x2="100" y2="74" />
          <line x1="100" y1="126" x2="100" y2="142" />
          <line x1="58" y1="100" x2="74" y2="100" />
          <line x1="126" y1="100" x2="142" y2="100" />
        </g>

        {/* Breathing core */}
        <motion.circle
          cx="100"
          cy="100"
          r={24}
          fill="url(#orb-core)"
          initial={{ r: 24 }}
          animate={{ r: active ? [24, 31, 24] : [22, 26, 22], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: state === "thinking" ? 0.9 : active ? 1.2 : 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <circle cx="100" cy="100" r="34" fill="none" stroke={TEAL} strokeOpacity="0.35" strokeWidth="0.8" strokeDasharray="2 3" />
      </svg>

      {showLabel && <span className="absolute -bottom-7 font-mono text-[11px] uppercase tracking-[0.35em] text-cyan/80 glow-text">{LABEL[state]}</span>}
    </button>
  );
}
