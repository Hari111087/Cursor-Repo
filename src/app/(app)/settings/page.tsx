"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { Bell, Brain, CheckCircle2, CircleSlash, Link2, Moon, Palette, Sun, Volume2, XCircle } from "lucide-react";
import { useAssistant } from "@/components/assistant-provider";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { api, useApi } from "@/lib/client";
import { enablePush, pushEnabled } from "@/lib/push-client";
import type { RiskProfile, Settings } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Status { demo: boolean; google: boolean; googleConfigured: boolean; ai: boolean; aiModel: string | null; market: string; push: boolean; vapidPublicKey: string | null; timezone: string }

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label?: string }) {
  return ok ? (
    <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> {label ?? "Connected"}</Badge>
  ) : (
    <Badge variant="muted"><XCircle className="h-3 w-3" /> {label ?? "Not connected"}</Badge>
  );
}

export default function SettingsPage() {
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const { voiceEnabled, setVoiceEnabled, speak, voiceSupported } = useAssistant();
  const status = useApi<Status>("/api/status");
  const settingsQ = useApi<{ settings: Settings }>("/api/settings");
  const risk = useApi<{ risk: RiskProfile | null }>("/api/insights");
  const [push, setPush] = useState<boolean | null>(null);
  const s = settingsQ.data?.settings;

  useEffect(() => {
    void pushEnabled().then(setPush).catch(() => setPush(false));
  }, []);

  const update = async (patch: Partial<Settings>) => {
    settingsQ.mutate((d) => (d ? { settings: { ...d.settings, ...patch } } : d));
    try {
      await api("/api/settings", { method: "PATCH", json: patch });
    } catch (e) {
      toast({ kind: "error", title: "Couldn't save", body: (e as Error).message });
      void settingsQ.reload();
    }
  };

  const turnOnPush = async () => {
    try {
      if (!status.data?.vapidPublicKey) throw new Error("Push isn't configured on the server (VAPID keys missing).");
      await enablePush(status.data.vapidPublicKey);
      setPush(true);
      toast({ kind: "success", title: "Push notifications enabled" });
    } catch (e) {
      toast({ kind: "error", title: "Couldn't enable push", body: (e as Error).message });
    }
  };

  const testPush = async () => {
    const res = await api<{ sent: number; skipped?: string }>("/api/push", { method: "POST", json: { test: true } });
    toast(res.sent ? { kind: "success", title: `Test sent to ${res.sent} device(s)` } : { kind: "info", title: "Nothing sent", body: res.skipped });
  };

  const st = status.data;

  return (
    <div>
      <PageHeader title="Settings" subtitle="Accounts, notifications and preferences." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Link2 />} title="Connected Accounts" subtitle={st ? `Timezone ${st.timezone}` : undefined} />
          <div className="divide-y divide-foreground/5">
            <Row label="Google (Gmail + Calendar)" hint={st?.demo ? "Demo mode: using sample data" : "Read mail, send on approval, read/create events"}>
              <div className="flex items-center gap-2">
                <StatusPill ok={Boolean(st?.google)} />
                {!st?.demo && st?.googleConfigured && (
                  st.google ? (
                    <Button size="sm" variant="ghost" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => signIn("google")}>Connect</Button>
                  )
                )}
              </div>
            </Row>
            <Row label="Claude AI" hint={st?.aiModel ? `Model: ${st.aiModel}` : "Set ANTHROPIC_API_KEY"}>
              <StatusPill ok={Boolean(st?.ai)} label={st?.ai ? "Online" : "Offline"} />
            </Row>
            <Row label="Market data" hint="Finnhub → Polygon → Alpha Vantage">
              <StatusPill ok={st?.market !== "mock"} label={st?.market === "mock" ? "Sample data" : st?.market} />
            </Row>
            <Row label="Web Push" hint="VAPID keys on the server">
              <StatusPill ok={Boolean(st?.push)} label={st?.push ? "Configured" : "Not configured"} />
            </Row>
          </div>
        </Card>

        <Card delay={0.05}>
          <CardHeader icon={<Bell />} title="Notifications" />
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-foreground/[0.02] p-3">
            <p className="flex-1 text-sm">{push ? "This device receives push notifications." : "Push is off on this device."}</p>
            {push ? <Button size="sm" variant="outline" onClick={testPush}>Send test</Button> : <Button size="sm" onClick={turnOnPush}>Enable on this device</Button>}
          </div>
          {s ? (
            <div className="divide-y divide-foreground/5">
              <Row label="New email" hint="AI-classified alerts">
                <div className="flex items-center gap-2">
                  <Select value={s.notifyEmailLevel} onChange={(e) => update({ notifyEmailLevel: e.target.value as Settings["notifyEmailLevel"] })} className="h-8 w-36 text-xs" aria-label="Email notification level" disabled={!s.notifyEmail}>
                    <option value="urgent">Urgent only</option>
                    <option value="important">Urgent + Important</option>
                    <option value="all">All mail</option>
                  </Select>
                  <Switch checked={s.notifyEmail} onCheckedChange={(v) => update({ notifyEmail: v })} aria-label="Email notifications" />
                </div>
              </Row>
              <Row label="Market alerts" hint="Price & % change alerts">
                <Switch checked={s.notifyMarkets} onCheckedChange={(v) => update({ notifyMarkets: v })} aria-label="Market notifications" />
              </Row>
              <Row label="Smart nudges" hint="Free-time and deadline reminders">
                <Switch checked={s.notifyNudges} onCheckedChange={(v) => update({ notifyNudges: v })} aria-label="Nudge notifications" />
              </Row>
              <Row label="Daily briefing" hint="Generated each morning">
                <div className="flex items-center gap-2">
                  <Input type="time" value={s.briefingTime} onChange={(e) => update({ briefingTime: e.target.value })} className="h-8 w-28 text-xs" aria-label="Briefing time" />
                  <Switch checked={s.notifyBriefing} onCheckedChange={(v) => update({ notifyBriefing: v })} aria-label="Briefing notifications" />
                </div>
              </Row>
            </div>
          ) : (
            <div className="skeleton h-40" />
          )}
        </Card>

        <Card delay={0.1}>
          <CardHeader icon={<CircleSlash />} title="Quiet Hours" subtitle="Only URGENT emails break through" />
          {s ? (
            <div className="divide-y divide-foreground/5">
              <Row label="Enable quiet hours">
                <Switch checked={s.quietHoursEnabled} onCheckedChange={(v) => update({ quietHoursEnabled: v })} aria-label="Quiet hours" />
              </Row>
              <div className={cn("grid grid-cols-2 gap-3 pt-3", !s.quietHoursEnabled && "opacity-50")}>
                <div>
                  <Label htmlFor="q-start">From</Label>
                  <Input id="q-start" type="time" value={s.quietStart} disabled={!s.quietHoursEnabled} onChange={(e) => update({ quietStart: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="q-end">Until</Label>
                  <Input id="q-end" type="time" value={s.quietEnd} disabled={!s.quietHoursEnabled} onChange={(e) => update({ quietEnd: e.target.value })} />
                </div>
              </div>
            </div>
          ) : (
            <div className="skeleton h-24" />
          )}
        </Card>

        <Card delay={0.15}>
          <CardHeader icon={<Palette />} title="Experience" />
          <div className="divide-y divide-foreground/5">
            <Row label="Voice replies" hint={voiceSupported ? "Spoken responses via speech synthesis" : "Voice input needs Chrome/Edge; replies work everywhere"}>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => speak("Systems online. Good to see you, Hari.")} aria-label="Test voice"><Volume2 /></Button>
                <Switch
                  checked={voiceEnabled}
                  onCheckedChange={(v) => {
                    setVoiceEnabled(v);
                    void update({ voiceEnabled: v });
                  }}
                  aria-label="Voice replies"
                />
              </div>
            </Row>
            <Row label="Theme">
              <div className="flex gap-1 rounded-md border p-1">
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTheme(t);
                      void update({ theme: t });
                    }}
                    aria-pressed={theme === t}
                    className={cn("flex items-center gap-1.5 rounded px-3 py-1 text-xs font-medium capitalize", theme === t ? "bg-cyan/15 text-cyan" : "text-muted-foreground")}
                  >
                    {t === "dark" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />} {t}
                  </button>
                ))}
              </div>
            </Row>
            <Row label="Risk profile" hint={risk.data?.risk ? `${risk.data.risk.horizonYears}-year horizon` : "Not set yet"}>
              <div className="flex items-center gap-2">
                {risk.data?.risk && <Badge variant={risk.data.risk.profile === "aggressive" ? "magenta" : risk.data.risk.profile === "moderate" ? "gold" : "success"}>{risk.data.risk.profile}</Badge>}
                <Button size="sm" variant="outline" asChild>
                  <Link href="/markets?tab=insights"><Brain /> {risk.data?.risk ? "Edit" : "Set up"}</Link>
                </Button>
              </div>
            </Row>
          </div>
        </Card>
      </div>
    </div>
  );
}
