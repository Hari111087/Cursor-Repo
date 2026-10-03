import { NextRequest } from "next/server";
import { z } from "zod";
import { getUserId, UnauthorizedError } from "@/lib/auth";
import { env } from "@/lib/env";
import { getQuotes, isIndian } from "@/lib/market";
import { SymbolSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Server-Sent Events price stream. The Finnhub API key stays on the server:
 *  - US symbols: relayed from Finnhub's trade websocket in real time.
 *  - Everything else (or no Finnhub key): REST polling every 10s; mock data jitters for a live feel.
 * The stream closes after ~55s (serverless limits); EventSource reconnects automatically.
 */
export async function GET(req: NextRequest) {
  try {
    await getUserId();
  } catch (e) {
    if (e instanceof UnauthorizedError) return new Response("Unauthorized", { status: 401 });
    throw e;
  }
  const parsed = z.array(SymbolSchema).max(30).safeParse((req.nextUrl.searchParams.get("symbols") ?? "").split(",").filter(Boolean));
  if (!parsed.success) return new Response("Bad symbols", { status: 400 });
  const symbols = parsed.data;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (data: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearTimeout(timeout);
        ws?.close();
        controller.close();
      };

      // Initial snapshot
      const base = await getQuotes(symbols);
      send({ type: "snapshot", quotes: base });
      const prevClose = new Map(base.map((q) => [q.symbol, q.price - q.change]));

      // Real-time trades for US symbols
      let ws: WebSocket | null = null;
      const usSymbols = symbols.filter((s) => !isIndian(s));
      if (env.hasFinnhub && usSymbols.length && typeof WebSocket !== "undefined") {
        ws = new WebSocket(`wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`);
        ws.addEventListener("open", () => usSymbols.forEach((s) => ws?.send(JSON.stringify({ type: "subscribe", symbol: s }))));
        ws.addEventListener("message", (ev) => {
          try {
            const msg = JSON.parse(String(ev.data)) as { type: string; data?: { s: string; p: number; t: number }[] };
            if (msg.type !== "trade" || !msg.data) return;
            const latest = new Map<string, { p: number; t: number }>();
            for (const t of msg.data) latest.set(t.s, t);
            for (const [s, t] of latest) {
              const pc = prevClose.get(s) ?? t.p;
              send({ type: "tick", symbol: s, price: t.p, change: t.p - pc, changePct: ((t.p - pc) / pc) * 100, at: new Date(t.t).toISOString() });
            }
          } catch {
            /* ignore malformed frames */
          }
        });
      }

      // Polling for the rest (and mock jitter in demo mode)
      const polled = ws ? symbols.filter(isIndian) : symbols;
      const poll = setInterval(async () => {
        if (!polled.length) return;
        const qs = await getQuotes(polled);
        for (const q of qs) {
          let price = q.price;
          if (q.source === "mock") price = Number((q.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
          const pc = prevClose.get(q.symbol) ?? q.price - q.change;
          send({ type: "tick", symbol: q.symbol, price, change: price - pc, changePct: ((price - pc) / pc) * 100, at: new Date().toISOString() });
        }
      }, 10_000);

      const timeout = setTimeout(close, 55_000);
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
