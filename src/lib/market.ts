import { z } from "zod";
import { aiJson, untrusted } from "./ai";
import { env } from "./env";
import { mockNews, mockQuote } from "./mock-data";
import type { NewsItem, Quote } from "./types";

/**
 * Market data with provider fallback:
 *   US:     Finnhub → Polygon (previous close) → Alpha Vantage → mock
 *   India:  Finnhub (.NS/.BO, plan-dependent) → Alpha Vantage (.BSE) → mock
 */

export const isIndian = (symbol: string) => /\.(NS|BO|BSE|NSE)$/i.test(symbol);
const marketOf = (symbol: string): Quote["market"] => (isIndian(symbol) ? "IN" : "US");
const currencyOf = (symbol: string) => (isIndian(symbol) ? "INR" : "USD");

const g = globalThis as unknown as { __quoteCache?: Map<string, { q: Quote; at: number }>; __sentiment?: Map<string, NewsItem["sentiment"]> };
const cache = (g.__quoteCache ??= new Map());
const sentimentCache = (g.__sentiment ??= new Map());

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function finnhubQuote(symbol: string): Promise<Quote | null> {
  if (!env.hasFinnhub) return null;
  const d = await getJson<{ c: number; d: number; dp: number; t: number }>(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${process.env.FINNHUB_API_KEY}`,
  );
  if (!d || !d.c) return null;
  return { symbol, market: marketOf(symbol), price: d.c, change: d.d ?? 0, changePct: d.dp ?? 0, currency: currencyOf(symbol), updatedAt: new Date((d.t || Date.now() / 1000) * 1000).toISOString() };
}

async function polygonQuote(symbol: string): Promise<Quote | null> {
  if (!env.hasPolygon || isIndian(symbol)) return null;
  const d = await getJson<{ results?: { c: number; o: number; t: number }[] }>(
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev?adjusted=true&apiKey=${process.env.POLYGON_API_KEY}`,
  );
  const r = d?.results?.[0];
  if (!r) return null;
  const change = r.c - r.o;
  return { symbol, market: "US", price: r.c, change, changePct: (change / r.o) * 100, currency: "USD", updatedAt: new Date(r.t).toISOString() };
}

async function alphaVantageQuote(symbol: string): Promise<Quote | null> {
  if (!env.hasAlphaVantage) return null;
  const avSymbol = isIndian(symbol) ? symbol.replace(/\.(NS|BO|NSE)$/i, ".BSE") : symbol;
  const d = await getJson<{ "Global Quote"?: Record<string, string> }>(
    `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(avSymbol)}&apikey=${process.env.ALPHA_VANTAGE_API_KEY}`,
  );
  const q = d?.["Global Quote"];
  if (!q || !q["05. price"]) return null;
  return {
    symbol, market: marketOf(symbol), price: Number(q["05. price"]), change: Number(q["09. change"]),
    changePct: Number((q["10. change percent"] || "0").replace("%", "")), currency: currencyOf(symbol), updatedAt: new Date().toISOString(),
  };
}

export async function getQuote(symbol: string): Promise<Quote & { source: string }> {
  const sym = symbol.toUpperCase();
  const hit = cache.get(sym);
  if (hit && Date.now() - hit.at < 15_000) return hit.q as Quote & { source: string };

  const providers: [string, (s: string) => Promise<Quote | null>][] = isIndian(sym)
    ? [["finnhub", finnhubQuote], ["alphavantage", alphaVantageQuote]]
    : [["finnhub", finnhubQuote], ["polygon", polygonQuote], ["alphavantage", alphaVantageQuote]];

  for (const [name, fn] of providers) {
    const q = await fn(sym);
    if (q) {
      const out = { ...q, source: name };
      cache.set(sym, { q: out, at: Date.now() });
      return out;
    }
  }
  const out = { ...mockQuote(sym), source: "mock" };
  cache.set(sym, { q: out, at: Date.now() });
  return out;
}

export async function getQuotes(symbols: string[]) {
  return Promise.all(symbols.map(getQuote));
}

// ── News + AI sentiment ──────────────────────────────────────────────────────
const SentimentSchema = z.object({
  items: z.array(z.object({ id: z.string(), sentiment: z.enum(["bullish", "bearish", "neutral"]) })),
});

async function tagSentiment(items: NewsItem[]): Promise<NewsItem[]> {
  const untagged = items.filter((n) => !n.sentiment && !sentimentCache.has(n.id));
  if (untagged.length && env.hasAI) {
    try {
      const res = await aiJson(SentimentSchema, {
        system: "Tag each market headline's sentiment for the related assets: bullish, bearish or neutral.",
        prompt: untrusted("news", untagged.map((n) => `id: ${n.id}\n${n.headline}\n${n.summary}`).join("\n---\n")),
        effort: "low",
      });
      for (const r of res.items) sentimentCache.set(r.id, r.sentiment);
    } catch (err) {
      console.error("[market] sentiment tagging failed", err);
    }
  }
  return items.map((n) => ({ ...n, sentiment: n.sentiment ?? sentimentCache.get(n.id) ?? "neutral" }));
}

export async function getNews(symbol?: string): Promise<{ news: NewsItem[]; source: string }> {
  if (env.hasFinnhub) {
    const token = process.env.FINNHUB_API_KEY;
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
    const url = symbol
      ? `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${weekAgo}&to=${today}&token=${token}`
      : `https://finnhub.io/api/v1/news?category=general&token=${token}`;
    const raw = await getJson<{ id: number; headline: string; summary: string; source: string; url: string; datetime: number; related?: string }[]>(url);
    if (raw?.length) {
      const items: NewsItem[] = raw.slice(0, 15).map((n) => ({
        id: String(n.id), headline: n.headline, summary: n.summary?.slice(0, 400) ?? "", source: n.source, url: n.url,
        datetime: new Date(n.datetime * 1000).toISOString(), symbols: n.related ? n.related.split(",").filter(Boolean) : [],
      }));
      return { news: await tagSentiment(items), source: "finnhub" };
    }
  }
  const items = mockNews().filter((n) => !symbol || n.symbols?.includes(symbol.toUpperCase()));
  return { news: items, source: "mock" };
}
