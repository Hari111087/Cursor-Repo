import { z } from "zod";
import { route } from "@/lib/api";
import { env } from "@/lib/env";
import { getQuotes } from "@/lib/market";
import { addHolding, deleteHolding, listHoldings } from "@/lib/repo";
import { SymbolSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/** Approximate FX for a unified base-currency view; set USD_INR in env for accuracy. */
const USD_INR = env.usdInr;

export const GET = route(async ({ userId }) => {
  const holdings = await listHoldings(userId);
  const quotes = await getQuotes(holdings.map((h) => h.symbol));
  const rows = holdings.map((h) => {
    const q = quotes.find((x) => x.symbol === h.symbol);
    const price = q?.price ?? h.avgCost;
    const fx = h.currency === "INR" ? 1 / USD_INR : 1;
    const value = price * h.quantity;
    const cost = h.avgCost * h.quantity;
    return {
      ...h, price, value, cost, pnl: value - cost, pnlPct: cost ? ((value - cost) / cost) * 100 : 0,
      dayChange: (q?.change ?? 0) * h.quantity, dayChangePct: q?.changePct ?? 0,
      valueUsd: value * fx, pnlUsd: (value - cost) * fx, dayChangeUsd: (q?.change ?? 0) * h.quantity * fx,
    };
  });
  const totals = rows.reduce((a, r) => ({ value: a.value + r.valueUsd, pnl: a.pnl + r.pnlUsd, day: a.day + r.dayChangeUsd, cost: a.cost + r.valueUsd - r.pnlUsd }), { value: 0, pnl: 0, day: 0, cost: 0 });
  const bySector = Object.entries(rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.sector || "Other"]: (acc[r.sector || "Other"] ?? 0) + r.valueUsd }), {})).map(([name, value]) => ({ name, value }));
  return Response.json({ rows, totals: { ...totals, pnlPct: totals.cost ? (totals.pnl / totals.cost) * 100 : 0 }, allocation: bySector, baseCurrency: "USD", usdInr: USD_INR });
});

const Body = z.object({
  symbol: SymbolSchema, name: z.string().max(100).optional(), quantity: z.number().positive(), avgCost: z.number().positive(),
  currency: z.enum(["USD", "INR"]).default("USD"), sector: z.string().max(50).optional(),
});

export const POST = route(async ({ req, userId }) => {
  const b = Body.parse(await req.json());
  return Response.json({ holding: await addHolding(userId, { ...b, name: b.name ?? b.symbol, sector: b.sector ?? null }) }, { status: 201 });
});

export const DELETE = route(async ({ req, userId }) => {
  await deleteHolding(userId, z.string().min(1).parse(req.nextUrl.searchParams.get("id")));
  return new Response(null, { status: 204 });
});
