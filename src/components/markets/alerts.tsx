"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/client";
import type { PriceAlert } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

const KIND_LABEL = { ABOVE: "Price above", BELOW: "Price below", PCT_UP: "Up by %", PCT_DOWN: "Down by %" } as const;

export function Alerts({ alerts, onChange, prefill }: { alerts: PriceAlert[]; onChange: (a: PriceAlert[]) => void; prefill?: { symbol: string; price: number } | null }) {
  const toast = useToast();
  const [f, setF] = useState({ symbol: "", kind: "ABOVE" as PriceAlert["kind"], threshold: "" });

  useEffect(() => {
    if (prefill) setF({ symbol: prefill.symbol, kind: "ABOVE", threshold: (prefill.price * 1.05).toFixed(2) });
  }, [prefill]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { alert } = await api<{ alert: PriceAlert }>("/api/markets/alerts", { method: "POST", json: { symbol: f.symbol, kind: f.kind, threshold: Number(f.threshold) } });
      onChange([alert, ...alerts]);
      setF({ symbol: "", kind: "ABOVE", threshold: "" });
      toast({ kind: "success", title: "Alert set", body: "You'll get a push notification when it triggers." });
    } catch (err) {
      toast({ kind: "error", title: "Couldn't create alert", body: (err as Error).message });
    }
  };

  const toggle = async (a: PriceAlert, active: boolean) => {
    onChange(alerts.map((x) => (x.id === a.id ? { ...x, active, triggeredAt: active ? null : x.triggeredAt } : x)));
    await api("/api/markets/alerts", { method: "PATCH", json: { id: a.id, active } });
  };

  const remove = async (id: string) => {
    onChange(alerts.filter((x) => x.id !== id));
    await api(`/api/markets/alerts?id=${id}`, { method: "DELETE" });
  };

  return (
    <Card>
      <CardHeader icon={<Bell />} title="Price Alerts" subtitle="Checked every few minutes · delivered as push notifications" />
      <form onSubmit={create} className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="a-sym">Symbol</Label>
          <Input id="a-sym" required value={f.symbol} onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase() })} placeholder="NVDA" />
        </div>
        <div>
          <Label htmlFor="a-kind">Condition</Label>
          <Select id="a-kind" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PriceAlert["kind"] })}>
            {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor="a-th">{f.kind.startsWith("PCT") ? "Percent" : "Price"}</Label>
          <Input id="a-th" required type="number" step="any" min="0" value={f.threshold} onChange={(e) => setF({ ...f, threshold: e.target.value })} />
        </div>
        <Button type="submit">Set alert</Button>
      </form>
      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No alerts yet.</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-md border bg-foreground/[0.02] px-3 py-2.5">
              {a.active ? <Bell className="h-4 w-4 text-gold" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-display text-xs font-semibold tracking-wider">{a.symbol}</span>{" "}
                  <span className="text-muted-foreground">{KIND_LABEL[a.kind].toLowerCase()}</span>{" "}
                  <span className="font-mono">{a.kind.startsWith("PCT") ? `${a.threshold}%` : a.threshold}</span>
                </p>
                {a.triggeredAt && <Badge variant="magenta" className="mt-1">Triggered {relativeTime(a.triggeredAt)}</Badge>}
              </div>
              <Switch checked={a.active} onCheckedChange={(v) => toggle(a, v)} aria-label={`Alert ${a.symbol} active`} />
              <button onClick={() => remove(a.id)} className="rounded p-1.5 text-muted-foreground hover:text-danger" aria-label="Delete alert"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
