"use client";
import { useEffect, useRef, useState } from "react";
import type { Quote } from "@/lib/types";

export type LiveQuote = Quote & { source?: string; flash?: "up" | "down" };

/** Subscribes to the server-side SSE price stream; the server keeps API keys private. */
export function useLiveQuotes(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, LiveQuote>>({});
  const [connected, setConnected] = useState(false);
  const key = symbols.slice().sort().join(",");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!key) return;
    const es = new EventSource(`/api/markets/stream?symbols=${encodeURIComponent(key)}`);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false); // EventSource auto-reconnects
    es.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.type === "snapshot") {
        setQuotes((q) => ({ ...q, ...Object.fromEntries((msg.quotes as LiveQuote[]).map((x) => [x.symbol, { ...q[x.symbol], ...x }])) }));
      } else if (msg.type === "tick") {
        setQuotes((q) => {
          const prev = q[msg.symbol];
          if (!prev) return q;
          const flash = msg.price > prev.price ? "up" : msg.price < prev.price ? "down" : prev.flash;
          clearTimeout(timers.current[msg.symbol]);
          timers.current[msg.symbol] = setTimeout(() => setQuotes((x) => (x[msg.symbol] ? { ...x, [msg.symbol]: { ...x[msg.symbol], flash: undefined } } : x)), 900);
          return { ...q, [msg.symbol]: { ...prev, price: msg.price, change: msg.change, changePct: msg.changePct, updatedAt: msg.at, flash, spark: prev.spark ? [...prev.spark.slice(1), msg.price] : prev.spark } };
        });
      }
    };
    return () => {
      es.close();
      setConnected(false);
    };
  }, [key]);

  return { quotes, connected };
}
