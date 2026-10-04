"use client";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Briefcase, Plus, Trash2 } from "lucide-react";
import { CountUp } from "@/components/hud/count-up";
import { Disclaimer } from "@/components/disclaimer";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { api, useApi } from "@/lib/client";
import type { Holding } from "@/lib/types";
import { cn, formatMoney, formatPct } from "@/lib/utils";

type Row = Holding & { price: number; value: number; pnl: number; pnlPct: number; dayChange: number; dayChangePct: number; valueUsd: number };
interface PortfolioData { rows: Row[]; totals: { value: number; pnl: number; pnlPct: number; day: number }; allocation: { name: string; value: number }[]; usdInr: number }

export const CHART_COLORS = ["#2EE6E6", "#FF8A1F", "#FF2A4D", "#FFB800", "#2BE3A0", "#5B8CFF", "#FF8A5B", "#B7F36B"];

export function Portfolio() {
  const toast = useToast();
  const { data, loading, reload } = useApi<PortfolioData>("/api/portfolio", { refreshMs: 60_000 });
  const [open, setOpen] = useState(false);

  const remove = async (id: string) => {
    await api(`/api/portfolio?id=${id}`, { method: "DELETE" });
    toast({ kind: "info", title: "Holding removed" });
    void reload();
  };

  const t = data?.totals;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total value", value: t?.value ?? 0, fmt: (n: number) => formatMoney(n), color: "" },
          { label: "Total P&L", value: t?.pnl ?? 0, fmt: (n: number) => `${n >= 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`, color: (t?.pnl ?? 0) >= 0 ? "text-success" : "text-danger", sub: t ? formatPct(t.pnlPct) : "" },
          { label: "Today", value: t?.day ?? 0, fmt: (n: number) => `${n >= 0 ? "+" : "−"}${formatMoney(Math.abs(n))}`, color: (t?.day ?? 0) >= 0 ? "text-success" : "text-danger" },
        ].map((k, i) => (
          <Card key={k.label} delay={i * 0.05} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</p>
            {loading ? <div className="skeleton mt-2 h-8 w-32" /> : <CountUp value={k.value} format={k.fmt} className={cn("mt-1 block font-display text-2xl font-bold", k.color)} />}
            {k.sub && <p className={cn("font-mono text-xs", k.color)}>{k.sub}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader icon={<Briefcase />} title="Allocation" subtitle="By sector (USD)" />
          <div className="relative h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.allocation ?? []} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={3} stroke="none">
                  {(data?.allocation ?? []).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatMoney(v)} contentStyle={{ background: "rgba(6,14,18,0.95)", border: "1px solid rgba(46,230,230,0.3)", borderRadius: 8 }} itemStyle={{ color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Holdings</p>
              <p className="font-display text-2xl font-bold">{data?.rows.length ?? 0}</p>
            </div>
          </div>
          <ul className="mt-3 space-y-1.5">
            {(data?.allocation ?? []).map((a, i) => (
              <li key={a.name} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {a.name}
                <span className="ml-auto font-mono text-muted-foreground">{t?.value ? ((a.value / t.value) * 100).toFixed(1) : 0}%</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader icon={<Briefcase />} title="Holdings" subtitle={data ? `INR converted at ${data.usdInr} for totals` : undefined} action={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Add</Button>} />
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2 font-medium">Asset</th>
                  <th className="pb-2 text-right font-medium">Qty</th>
                  <th className="pb-2 text-right font-medium">Avg cost</th>
                  <th className="pb-2 text-right font-medium">Price</th>
                  <th className="pb-2 text-right font-medium">Value</th>
                  <th className="pb-2 text-right font-medium">P&amp;L</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/5">
                {(data?.rows ?? []).map((r) => (
                  <tr key={r.id} className="group">
                    <td className="py-2.5">
                      <p className="font-display text-xs font-semibold tracking-wider">{r.symbol}</p>
                      <p className="text-xs text-muted-foreground">{r.sector}</p>
                    </td>
                    <td className="py-2.5 text-right font-mono">{r.quantity}</td>
                    <td className="py-2.5 text-right font-mono">{formatMoney(r.avgCost, r.currency)}</td>
                    <td className="py-2.5 text-right font-mono">{formatMoney(r.price, r.currency)}</td>
                    <td className="py-2.5 text-right font-mono">{formatMoney(r.value, r.currency)}</td>
                    <td className={cn("py-2.5 text-right font-mono text-xs", r.pnl >= 0 ? "text-success" : "text-danger")}>
                      {r.pnl >= 0 ? "+" : "−"}{formatMoney(Math.abs(r.pnl), r.currency)}<br />{formatPct(r.pnlPct)}
                    </td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => remove(r.id)} className="rounded p-1.5 opacity-50 hover:bg-danger/10 hover:text-danger group-hover:opacity-100" aria-label={`Remove ${r.symbol}`}><Trash2 className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <Disclaimer />
      <AddHolding open={open} onOpenChange={setOpen} onAdded={reload} />
    </div>
  );
}

function AddHolding({ open, onOpenChange, onAdded }: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ symbol: "", quantity: "", avgCost: "", currency: "USD", sector: "" });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/portfolio", { method: "POST", json: { symbol: f.symbol, quantity: Number(f.quantity), avgCost: Number(f.avgCost), currency: f.currency, sector: f.sector || undefined } });
      onOpenChange(false);
      setF({ symbol: "", quantity: "", avgCost: "", currency: "USD", sector: "" });
      onAdded();
    } catch (err) {
      toast({ kind: "error", title: "Couldn't add holding", body: (err as Error).message });
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Add holding" description="Track a position manually. No trades are ever placed.">
        <form onSubmit={submit} className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label htmlFor="h-sym">Symbol</Label>
            <Input id="h-sym" required value={f.symbol} onChange={(e) => { const v = e.target.value.toUpperCase(); setF({ ...f, symbol: v, currency: /\.(NS|BO)$/.test(v) ? "INR" : f.currency }); }} placeholder="AAPL or INFY.NS" />
          </div>
          <div>
            <Label htmlFor="h-qty">Quantity</Label>
            <Input id="h-qty" required type="number" step="any" min="0" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="h-cost">Avg cost</Label>
            <Input id="h-cost" required type="number" step="any" min="0" value={f.avgCost} onChange={(e) => setF({ ...f, avgCost: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="h-cur">Currency</Label>
            <Select id="h-cur" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
              <option>USD</option>
              <option>INR</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="h-sec">Sector</Label>
            <Input id="h-sec" value={f.sector} onChange={(e) => setF({ ...f, sector: e.target.value })} placeholder="Technology" />
          </div>
          <Button type="submit" className="col-span-2">Add holding</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
