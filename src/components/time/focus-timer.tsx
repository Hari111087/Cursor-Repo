"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coffee, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { useAssistant } from "@/components/assistant-provider";
import { api } from "@/lib/client";
import type { FocusSession, Task } from "@/lib/types";

const PRESETS = { focus: 25, short: 5, long: 15 } as const;
type Mode = keyof typeof PRESETS;

export function FocusTimer({ tasks, sessions, onSession }: { tasks: Task[]; sessions: FocusSession[]; onSession: (s: FocusSession) => void }) {
  const toast = useToast();
  const { speak } = useAssistant();
  const [mode, setMode] = useState<Mode>("focus");
  const [remaining, setRemaining] = useState(PRESETS.focus * 60);
  const [running, setRunning] = useState(false);
  const [taskId, setTaskId] = useState<string>("");
  const startedAt = useRef<Date | null>(null);
  const endAt = useRef<number>(0);

  const total = PRESETS[mode] * 60;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        setRunning(false);
        void complete();
      }
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    const m = String(Math.floor(remaining / 60)).padStart(2, "0");
    const s = String(remaining % 60).padStart(2, "0");
    document.title = running ? `${m}:${s} · ${mode === "focus" ? "Focus" : "Break"}` : "Time · Hari's Assistant";
  }, [remaining, running, mode]);

  const complete = async () => {
    const start = startedAt.current ?? new Date(Date.now() - total * 1000);
    const minutes = Math.max(1, Math.round((Date.now() - start.getTime()) / 60000));
    try {
      const { session } = await api<{ session: FocusSession }>("/api/focus", {
        method: "POST",
        json: { taskId: taskId || null, kind: mode === "focus" ? "focus" : "break", minutes, startedAt: start.toISOString(), endedAt: new Date().toISOString() },
      });
      onSession(session);
    } catch {
      /* stats are best-effort */
    }
    const msg = mode === "focus" ? "Focus session complete. Take a short break." : "Break's over. Ready for the next sprint?";
    toast({ kind: "success", title: msg });
    speak(msg);
    if ("Notification" in window && Notification.permission === "granted") new Notification("Jarvis", { body: msg, icon: "/icons/192" });
    const next: Mode = mode === "focus" ? "short" : "focus";
    setMode(next);
    setRemaining(PRESETS[next] * 60);
    startedAt.current = null;
  };

  const toggle = () => {
    if (running) {
      setRunning(false);
      return;
    }
    if (!startedAt.current) startedAt.current = new Date();
    endAt.current = Date.now() + remaining * 1000;
    setRunning(true);
  };

  const reset = (m: Mode = mode) => {
    setRunning(false);
    setMode(m);
    setRemaining(PRESETS[m] * 60);
    startedAt.current = null;
  };

  const today = new Date().toDateString();
  const todays = sessions.filter((s) => s.kind === "focus" && new Date(s.startedAt).toDateString() === today);
  const pct = 1 - remaining / total;
  const R = 70;
  const C = 2 * Math.PI * R;
  const color = mode === "focus" ? "#2EE6E6" : "#2BE3A0";

  return (
    <Card delay={0.1}>
      <CardHeader icon={<Timer />} title="Focus Timer" subtitle={`${todays.length} sessions · ${todays.reduce((a, s) => a + s.minutes, 0)} min today`} />
      <div className="mb-4 flex justify-center gap-1">
        {(Object.keys(PRESETS) as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => reset(m)}
            className={`rounded-md px-3 py-1 text-xs font-medium uppercase tracking-wider ${mode === m ? "bg-cyan/15 text-cyan" : "text-muted-foreground hover:text-foreground"}`}
          >
            {m === "focus" ? "Focus" : m === "short" ? "Short" : "Long"}
          </button>
        ))}
      </div>
      <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
        <svg viewBox="0 0 160 160" className="absolute inset-0 -rotate-90">
          <circle cx="80" cy="80" r={R} fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="6" />
          <motion.circle
            cx="80" cy="80" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.3 }}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div className="text-center">
          <p className="font-display text-4xl font-bold tabular-nums" aria-live="off">
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
          </p>
          <p className="mt-1 flex items-center justify-center gap-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {mode === "focus" ? "Deep work" : <><Coffee className="h-3 w-3" /> Recharge</>}
          </p>
        </div>
      </div>
      <Select className="mt-4" value={taskId} onChange={(e) => setTaskId(e.target.value)} aria-label="Task to focus on">
        <option value="">No specific task</option>
        {tasks.filter((t) => t.bucket !== "DONE").map((t) => (
          <option key={t.id} value={t.id}>{t.priority} · {t.title}</option>
        ))}
      </Select>
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={toggle} variant={running ? "secondary" : "default"}>
          {running ? <><Pause /> Pause</> : <><Play /> {startedAt.current ? "Resume" : "Start"}</>}
        </Button>
        <Button variant="ghost" onClick={() => reset()} aria-label="Reset timer">
          <RotateCcw />
        </Button>
      </div>
    </Card>
  );
}
