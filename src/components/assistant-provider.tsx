"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrbState } from "./hud/orb";
import { api } from "@/lib/client";
import { useToast } from "./toast";

type Exchange = { role: "you" | "jarvis"; text: string };

interface AssistantCtx {
  state: OrbState;
  voiceEnabled: boolean;
  setVoiceEnabled: (v: boolean) => void;
  voiceSupported: boolean;
  listen: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  ask: (text: string) => Promise<string | null>;
  history: Exchange[];
  commandOpen: boolean;
  setCommandOpen: (v: boolean) => void;
}

const Ctx = createContext<AssistantCtx | null>(null);
export const useAssistant = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAssistant outside provider");
  return c;
};

// Minimal typings for the (prefixed) Web Speech API
type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<OrbState>("idle");
  const [voiceEnabled, setVoiceEnabledState] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [history, setHistory] = useState<Exchange[]>([]);
  const [commandOpen, setCommandOpen] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    setVoiceSupported(Boolean(w.SpeechRecognition || w.webkitSpeechRecognition));
    try {
      const v = localStorage.getItem("voiceEnabled");
      if (v !== null) setVoiceEnabledState(v === "true");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const setVoiceEnabled = useCallback((v: boolean) => {
    setVoiceEnabledState(v);
    try {
      localStorage.setItem("voiceEnabled", String(v));
    } catch {
      /* ignore */
    }
    if (!v) window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!voiceEnabled || typeof window === "undefined" || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      u.voice = voices.find((v) => /en-(GB|IN)/.test(v.lang) && /male|daniel|rishi|google uk/i.test(v.name)) ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
      u.rate = 1.03;
      u.pitch = 0.95;
      u.onstart = () => setState("speaking");
      u.onend = () => setState("idle");
      u.onerror = () => setState("idle");
      window.speechSynthesis.speak(u);
    },
    [voiceEnabled],
  );

  const ask = useCallback(
    async (text: string) => {
      setHistory((h) => [...h, { role: "you", text }]);
      setState("thinking");
      try {
        const res = await api<{ reply: string; action?: { type: string; path?: string; title?: string } }>("/api/command", { method: "POST", json: { text } });
        setHistory((h) => [...h, { role: "jarvis", text: res.reply }]);
        setState("idle");
        speak(res.reply);
        if (res.action?.type === "navigate" && res.action.path) router.push(res.action.path);
        if (res.action?.type === "create_task") toast({ kind: "success", title: "Task added", body: res.action.title });
        if (res.action?.type === "create_event") toast({ kind: "success", title: "Event created", body: res.action.title });
        return res.reply;
      } catch (e) {
        setState("idle");
        const msg = (e as Error).message;
        setHistory((h) => [...h, { role: "jarvis", text: msg }]);
        toast({ kind: "error", title: "Command failed", body: msg });
        return null;
      }
    },
    [router, speak, toast],
  );

  const listen = useCallback(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Rec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Rec) {
      toast({ kind: "info", title: "Voice input isn't supported in this browser", body: "Try Chrome or Edge, or use the command bar (⌘K)." });
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new Rec();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    let heard = "";
    rec.onresult = (e) => {
      heard = Array.from(e.results).map((r) => r[0].transcript).join(" ");
    };
    rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") toast({ kind: "error", title: "Microphone error", body: e.error });
    };
    rec.onend = () => {
      recRef.current = null;
      if (heard.trim()) void ask(heard.trim());
      else setState("idle");
    };
    recRef.current = rec;
    setState("listening");
    rec.start();
  }, [ask, toast]);

  const stopListening = useCallback(() => recRef.current?.stop(), []);

  return (
    <Ctx.Provider value={{ state, voiceEnabled, setVoiceEnabled, voiceSupported, listen, stopListening, speak, ask, history, commandOpen, setCommandOpen }}>
      {children}
    </Ctx.Provider>
  );
}
