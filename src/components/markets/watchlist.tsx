"use client";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { BellPlus, Plus, Radio, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast";
import { api } from "@/lib/client";
import type { WatchItem } from "@/lib/types";
import { cn, formatMoney, formatPct } from "@/lib/utils";
import type { LiveQuote } from "./use-live-quotes";

export function Watchlist({ items, quotes, connected, onAdd, onRemove, onAlert }: {
  items: WatchItem[]; quotes: Record<string, LiveQuote>; connected: boolean;
  onAdd: (w: WatchItem) => void; onRemove: (id: string) => void; onAlert: (symbol: string, price: number) => void;
}) {
  const toast = useToast();
  const [symbol, setSymbol] = useState("");
  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    try {
      const { item } = await api<{ item: WatchItem }>("/api/markets/watchlist", { method: "POST", json: { symbol: symbol.trim() } });
      onAdd(item);
      setSymbol("");
    } catch (err) {
      toast({ kind: "error", title: "Couldn't add symbol", body: (err as Error).message });
    }
  };
  return (
    <Card>
      <CardHeader
        icon={<Radio />}
        title="Live Watchlist"
        subtitle="US tickers (AAPL) · NSE (RELIANCE.NS) · BSE (TCS.BO)"
        action={<Badge variant={connected ? "success" : "muted"}><span className={cn("h-1.5 w-1.5 rounded-full", connected ? "animate-pulse bg-success" : "bg-muted-foreground")} />{connected ? "Live" : "Offline"}</Badge>}
      />
      <form onSubmit={add} className="mb-4 flex gap-2">
        <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} placeholder="Add symbol…" aria-label="Symbol" maxLength={20} />
        <Button type="submit" variant="outline"><Plus /> Add</Button>
      </form>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="pb-2 font-medium">Symbol</th>
              <th className="pb-2 text-right font-medium">Price</th>
              <th className="pb-2 text-right font-medium">Change</th>
              <th className="w-32 pb-2 font-medium"><span className="sr-only">Trend</span></th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-foreground/5">
            {items.map((w) => {
              const q = quotes[w.symbol];
              const up = (q?.changePct ?? 0) >= 0;
              return (
                <tr key={w.id} className="group">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs font-semibold tracking-wider">{w.symbol}</span>
                      <Badge variant={w.market === "IN" ? "violet" : "muted"} className="px-1.5 text-[9px]">{w.market}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{w.name}</p>
                  </td>
                  <td className={cn("py-2.5 text-right font-mono tabular-nums transition-colors duration-500", q?.flash === "up" && "text-success", q?.flash === "down" && "text-danger")}>
                    {q ? formatMoney(q.price, q.currency) : <span className="skeleton inline-block h-4 w-16" />}
                  </td>
                  <td className={cn("py-2.5 text-right font-mono text-xs tabular-nums", up ? "text-success" : "text-danger")}>
                    {q && (<>{up ? "+" : ""}{q.change.toFixed(2)}<br />{formatPct(q.changePct)}</>)}
                  </td>
                  <td className="h-12 py-1 pl-4">
                    {q?.spark && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={q.spark.map((v, i) => ({ i, v }))}>
                          <YAxis hide domain={["dataMin", "dataMax"]} />
                          <Line dataKey="v" stroke={up ? "#22E3A0" : "#FF4D6D"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                      <button onClick={() => q && onAlert(w.symbol, q.price)} className="rounded p-1.5 hover:bg-gold/10 hover:text-gold" aria-label={`Create alert for ${w.symbol}`}><BellPlus className="h-4 w-4" /></button>
                      <button onClick={() => onRemove(w.id)} className="rounded p-1.5 hover:bg-danger/10 hover:text-danger" aria-label={`Remove ${w.symbol}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
