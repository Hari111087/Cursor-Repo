"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import { ArrowRight, CalendarDays, Command, Lightbulb, LineChart as LineIcon, Mail, MapPin, RefreshCw, Sparkles, Target, Video, Volume2 } from "lucide-react";
import { useAssistant } from "@/components/assistant-provider";
import { CountUp } from "@/components/hud/count-up";
import { Orb } from "@/components/hud/orb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client";
import { CATEGORY_BADGE, PRIORITY_COLOR } from "@/lib/ui";
import type { Briefing, CalendarEvent, EmailSummary, Quote, Task } from "@/lib/types";
import { cn, formatMoney, formatPct, formatTime, greeting, OWNER_NAME, relativeTime } from "@/lib/utils";

interface Dashboard {
  events: CalendarEvent[];
  emails: EmailSummary[];
  unreadCount: number;
  quotes: (Quote & { source: string })[];
  portfolio: { value: number; dayChange: number };
  priorities: Task[];
  nudges: string[];
  briefing: Briefing | null;
}

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return <div className="h-20" />;
  return (
    <div>
      <p className="font-display text-5xl font-bold tabular-nums tracking-wider text-foreground md:text-6xl">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        <span className="ml-1 text-2xl text-cyan/70">{String(now.getSeconds()).padStart(2, "0")}</span>
      </p>
      <p className="mt-1 text-sm uppercase tracking-[0.25em] text-muted-foreground">
        {now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
      </p>
    </div>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10" />
      ))}
    </div>
  );
}

export default function CommandCenter() {
  const { data, loading, reload, mutate } = useApi<Dashboard>("/api/dashboard", { refreshMs: 120_000 });
  const { state, listen, setCommandOpen, speak } = useAssistant();
  const toast = useToast();
  const [hello, setHello] = useState("Hello");
  const [genLoading, setGenLoading] = useState(false);

  useEffect(() => setHello(greeting()), []);

  const generate = async () => {
    setGenLoading(true);
    try {
      const { briefing } = await api<{ briefing: Briefing }>("/api/briefing", { method: "POST" });
      mutate((d) => (d ? { ...d, briefing } : d));
      toast({ kind: "success", title: "Briefing ready" });
    } catch (e) {
      toast({ kind: "error", title: "Couldn't generate briefing", body: (e as Error).message });
    } finally {
      setGenLoading(false);
    }
  };

  const readBriefing = () => {
    const b = data?.briefing;
    if (!b) return;
    speak(`${hello}, ${OWNER_NAME}. ${b.headline} ${b.sections.map((s) => `${s.title}: ${s.points.join(" ")}`).join(" ")} Your top priorities: ${b.priorities.join("; ")}.`);
  };

  const now = Date.now();
  const upcoming = (data?.events ?? []).filter((e) => new Date(e.end).getTime() > now);

  return (
    <div className="space-y-6">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="order-2 text-center lg:order-1 lg:text-left">
          {/* Handwritten greeting (Great Vibes); scripts need extra size and no letter-spacing to read well */}
          <h1 className="font-script text-5xl font-normal leading-tight tracking-normal md:text-6xl">
            <span className="text-gradient -mx-3 px-3">{hello},</span>
            <br />
            <span className="text-foreground">{OWNER_NAME}</span>
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {loading ? "Syncing systems…" : `${upcoming.length} events ahead · ${data?.unreadCount ?? 0} unread emails · ${data?.priorities.length ?? 0} priorities`}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
            <Button variant="outline" onClick={() => setCommandOpen(true)}>
              <Command /> Command <kbd className="ml-1 rounded border border-cyan/30 px-1 text-[10px]">⌘K</kbd>
            </Button>
            <Button variant="ghost" onClick={() => reload()} aria-label="Refresh dashboard">
              <RefreshCw /> Sync
            </Button>
          </div>
        </motion.div>

        <div className="order-1 flex justify-center pb-6 lg:order-2">
          <Orb state={state} size={240} onClick={listen} />
        </div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} className="order-3 text-center lg:text-right">
          <Clock />
          {data?.nudges?.[0] && (
            <div className="mt-4 inline-flex max-w-md items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-left text-sm text-gold">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {data.nudges[0]}
            </div>
          )}
        </motion.div>
      </section>

      {/* ── Daily briefing ───────────────────────────────────── */}
      <Card delay={0.05} className="border-violet/30">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet to-transparent" />
        <CardHeader
          icon={<Sparkles />}
          title="Daily Briefing"
          subtitle={data?.briefing ? `Generated ${relativeTime(data.briefing.generatedAt)}${data.briefing.source === "mock" ? " · sample" : data.briefing.source === "basic" ? " · basic (no AI key)" : ""}` : "Calendar · Email · Markets"}
          action={
            <div className="flex gap-1">
              {data?.briefing && (
                <Button size="sm" variant="ghost" onClick={readBriefing} aria-label="Read briefing aloud">
                  <Volume2 />
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={generate} disabled={genLoading}>
                <Sparkles className={cn(genLoading && "animate-spin")} /> {data?.briefing ? "Refresh" : "Generate"}
              </Button>
            </div>
          }
        />
        {loading ? (
          <Skeleton rows={2} />
        ) : data?.briefing ? (
          <div className="space-y-4">
            <p className="text-base font-medium md:text-lg">{data.briefing.headline}</p>
            <div className="grid gap-4 md:grid-cols-3">
              {data.briefing.sections.map((s) => (
                <div key={s.title} className="rounded-lg border bg-foreground/[0.02] p-3">
                  <p className="mb-2 font-display text-[11px] uppercase tracking-[0.2em] text-cyan">{s.title}</p>
                  <ul className="space-y-1.5 text-sm text-foreground/85">
                    {s.points.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No briefing yet today. It generates automatically each morning, or tap Generate.</p>
        )}
      </Card>

      {/* ── Live cards ───────────────────────────────────────── */}
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Card delay={0.1} className="xl:col-span-2">
          <CardHeader icon={<CalendarDays />} title="Today's Schedule" action={<Link href="/time" className="whitespace-nowrap text-xs text-cyan hover:underline">Open <ArrowRight className="inline h-3 w-3" /></Link>} />
          {loading ? (
            <Skeleton />
          ) : (data?.events.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled. Enjoy the open runway.</p>
          ) : (
            <ol className="relative space-y-3 border-l border-cyan/20 pl-5">
              {data!.events.map((e, i) => {
                const past = new Date(e.end).getTime() < now;
                const live = new Date(e.start).getTime() <= now && !past;
                return (
                  <motion.li key={e.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className={cn("relative", past && "opacity-45")}>
                    <span className={cn("absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2", live ? "border-magenta bg-magenta shadow-glow-magenta" : "border-cyan bg-background")} />
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <p className="font-medium">{e.title}</p>
                      <p className="font-mono text-xs text-cyan">
                        {e.allDay ? "All day" : `${formatTime(e.start)} – ${formatTime(e.end)}`}
                      </p>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {live && <Badge variant="magenta">Now</Badge>}
                      {e.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{e.location}</span>}
                      {e.meetLink && <a href={e.meetLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan hover:underline"><Video className="h-3 w-3" />Join</a>}
                    </div>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </Card>

        <Card delay={0.15} className="xl:col-span-2">
          <CardHeader
            icon={<Mail />}
            title="Important Email"
            subtitle={`${data?.unreadCount ?? 0} unread`}
            action={<Link href="/email" className="whitespace-nowrap text-xs text-cyan hover:underline">Inbox <ArrowRight className="inline h-3 w-3" /></Link>}
          />
          {loading ? (
            <Skeleton />
          ) : (data?.emails.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">Inbox zero on what matters. Nice.</p>
          ) : (
            <ul className="space-y-2">
              {data!.emails.map((e) => (
                <li key={e.id}>
                  <Link href={`/email?id=${e.id}`} className="block rounded-md border border-transparent p-2 transition-colors hover:border-cyan/30 hover:bg-cyan/5">
                    <div className="flex items-center gap-2">
                      <Badge variant={CATEGORY_BADGE[e.category]}>{e.category}</Badge>
                      <span className="truncate text-xs text-muted-foreground">{e.from.replace(/<.*>/, "")}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{relativeTime(e.receivedAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-medium">{e.subject}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card delay={0.2} className="xl:col-span-3">
          <CardHeader
            icon={<LineIcon />}
            title="Market Snapshot"
            action={<Link href="/markets" className="whitespace-nowrap text-xs text-cyan hover:underline">Markets <ArrowRight className="inline h-3 w-3" /></Link>}
          />
          {loading ? (
            <Skeleton rows={2} />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end gap-x-6 gap-y-1">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Portfolio</p>
                  <CountUp value={data?.portfolio.value ?? 0} format={(n) => formatMoney(n)} className="font-display text-2xl font-bold" />
                </div>
                <p className={cn("font-mono text-sm", (data?.portfolio.dayChange ?? 0) >= 0 ? "text-success" : "text-danger")}>
                  {(data?.portfolio.dayChange ?? 0) >= 0 ? "▲" : "▼"} <CountUp value={Math.abs(data?.portfolio.dayChange ?? 0)} format={(n) => formatMoney(n)} /> today
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {data?.quotes.map((q) => {
                  const up = q.changePct >= 0;
                  return (
                    <div key={q.symbol} className="rounded-lg border bg-foreground/[0.02] p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-xs font-semibold tracking-wider">{q.symbol.replace(/\.(NS|BO)$/, "")}</p>
                        <Badge variant={q.market === "IN" ? "violet" : "muted"} className="px-1.5 text-[9px]">{q.market}</Badge>
                      </div>
                      <p className="mt-1 font-mono text-sm">{formatMoney(q.price, q.currency)}</p>
                      <p className={cn("font-mono text-xs", up ? "text-success" : "text-danger")}>{formatPct(q.changePct)}</p>
                      {q.spark && (
                        <div className="mt-1 h-8" aria-hidden>
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={q.spark.map((v, i) => ({ i, v }))}>
                              <YAxis hide domain={["dataMin", "dataMax"]} />
                              <Line type="monotone" dataKey="v" stroke={up ? "#22E3A0" : "#FF4D6D"} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card delay={0.25}>
          <CardHeader icon={<Target />} title="Top 3 Priorities" action={<Link href="/time" className="whitespace-nowrap text-xs text-cyan hover:underline">Tasks <ArrowRight className="inline h-3 w-3" /></Link>} />
          {loading ? (
            <Skeleton />
          ) : (data?.priorities.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No open tasks. Add one with ⌘K.</p>
          ) : (
            <ol className="space-y-3">
              {data!.priorities.map((t, i) => (
                <li key={t.id} className="flex gap-3">
                  <span className="font-display text-2xl font-bold leading-none text-gradient">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className={PRIORITY_COLOR[t.priority]}>{t.priority}</span>
                      {t.dueAt && ` · due ${formatTime(t.dueAt)}`} · {t.estimateMin}m
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
          {data?.nudges && data.nudges.length > 1 && (
            <div className="mt-4 space-y-1 border-t pt-3">
              {data.nudges.slice(1).map((n, i) => (
                <p key={i} className="text-xs text-muted-foreground">💡 {n}</p>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
