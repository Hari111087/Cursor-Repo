"use client";
import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; title: string; body?: string; kind: "success" | "error" | "info" };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { ...t, id }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-24 right-4 z-[60] flex w-[min(360px,calc(100%-2rem))] flex-col gap-2 md:bottom-6" role="status" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                className={cn("glass pointer-events-auto flex gap-3 rounded-lg p-3 shadow-glow", t.kind === "error" && "border-danger/50", t.kind === "success" && "border-success/50")}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", t.kind === "error" ? "text-danger" : t.kind === "success" ? "text-success" : "text-cyan")} />
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  {t.body && <p className="text-xs text-muted-foreground">{t.body}</p>}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
