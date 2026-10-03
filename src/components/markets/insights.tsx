"use client";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { AlertTriangle, Brain, Lightbulb, RefreshCcw, Scale, Sparkles } from "lucide-react";
import { Disclaimer } from "@/components/disclaimer";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Label, Textarea } from "@/components/ui/input";
import { api, useApi } from "@/lib/client";
import type { InsightPlan, RiskProfile } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";
import { CHART_COLORS } from "./portfolio";

const QUESTIONS = [
  { id: "drawdown", q: "Your portfolio drops 20% in a month. You…", options: ["Sell to stop losses", "Hold and wait", "Buy more at lower prices"] },
  { id: "goal", q: "Your primary objective is…", options: ["Preserve capital", "Balanced growth", "Maximize long-term growth"] },
  { id: "experience", q: "Your investing experience:", options: ["Beginner", "A few years", "Experienced, through cycles"] },
  { id: "emergency", q: "Emergency fund in place?", options: ["Not yet", "About 3 months", "6+ months"] },
  { id: "income", q: "Your income is…", options: ["Variable / uncertain", "Stable", "Stable with regular surplus"] },
] as const;

const PROFILES = ["conservative", "moderate", "aggressive"] as const;

export function Insights() {
  const toast = useToast();
  const { data, loading } = useApi<{ risk: RiskProfile | null; insight: (InsightPlan & { template?: boolean }) | null }>("/api/insights");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [override, setOverride] = useState<RiskProfile["profile"] | null>(null);
  const [goals, setGoals] = useState("Build long-term wealth, buy a home in ~7 years, and retire comfortably.");
  const [horizon, setHorizon] = useState(10);
  const [plan, setPlan] = useState<(InsightPlan & { template?: boolean }) | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPlan(data.insight);
    if (data.risk) {
      setGoals(data.risk.goals);
      setHorizon(data.risk.horizonYears);
      setOverride(data.risk.profile);
      const restored: Record<string, number> = {};
      for (const q of QUESTIONS) {
        const idx = q.options.findIndex((o) => o === data.risk!.answers[q.id]);
        if (idx >= 0) restored[q.id] = idx;
      }
      setAnswers(restored);
    }
  }, [data]);

  const answered = Object.keys(answers).length;
  const suggested = useMemo(() => {
    if (answered === 0) return "moderate" as const;
    const avg = Object.values(answers).reduce((a, b) => a + b, 0) / answered;
    const adj = avg + (horizon >= 10 ? 0.25 : horizon <= 3 ? -0.4 : 0);
    return adj < 0.8 ? "conservative" : adj < 1.45 ? "moderate" : "aggressive";
  }, [answers, answered, horizon]);
  const profile = override ?? suggested;

  const generate = async () => {
    setBusy(true);
    try {
      const res = await api<{ insight: InsightPlan & { template?: boolean } }>("/api/insights", {
        method: "POST",
        json: { profile, goals, horizonYears: horizon, answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, QUESTIONS.find((q) => q.id === k)!.options[v]])) },
      });
      setPlan(res.insight);
    } catch (e) {
      toast({ kind: "error", title: "Couldn't generate insights", body: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <div className="skeleton h-96" />;

  return (
    <div className="space-y-6">
      <Disclaimer />
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader icon={<Brain />} title="Risk Profile" subtitle={`${answered}/${QUESTIONS.length} answered`} />
          <div className="space-y-5">
            {QUESTIONS.map((q) => (
              <fieldset key={q.id}>
                <legend className="mb-2 text-sm font-medium">{q.q}</legend>
                <div className="grid gap-1.5">
                  {q.options.map((o, i) => (
                    <button
                      key={o}
                      type="button"
                      aria-pressed={answers[q.id] === i}
                      onClick={() => setAnswers({ ...answers, [q.id]: i })}
                      className={cn("rounded-md border px-3 py-2 text-left text-sm transition-all", answers[q.id] === i ? "border-cyan/60 bg-cyan/10 text-cyan" : "text-muted-foreground hover:border-foreground/20 hover:text-foreground")}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <div>
              <Label htmlFor="horizon">Time horizon: <span className="text-cyan">{horizon} years</span></Label>
              <input id="horizon" type="range" min={1} max={40} value={horizon} onChange={(e) => setHorizon(Number(e.target.value))} className="w-full accent-[#00E5FF]" />
            </div>
            <div>
              <Label htmlFor="goals">Goals</Label>
              <Textarea id="goals" value={goals} onChange={(e) => setGoals(e.target.value)} />
            </div>
            <div>
              <Label>Profile {override === null && <span className="normal-case text-muted-foreground">(suggested)</span>}</Label>
              <div className="flex gap-2">
                {PROFILES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setOverride(p)}
                    aria-pressed={profile === p}
                    className={cn("flex-1 rounded-md border px-2 py-2 text-xs font-semibold uppercase tracking-wider", profile === p ? (p === "conservative" ? "border-success/60 bg-success/10 text-success" : p === "moderate" ? "border-gold/60 bg-gold/10 text-gold" : "border-magenta/60 bg-magenta/10 text-magenta") : "text-muted-foreground")}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <Button className="w-full" variant="secondary" size="lg" onClick={generate} disabled={busy || goals.length < 3}>
              <Sparkles className={cn(busy && "animate-spin")} /> {busy ? "Analyzing…" : plan ? "Regenerate insights" : "Generate insights"}
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          {!plan ? (
            <Card className="flex min-h-[300px] flex-col items-center justify-center text-center">
              <Lightbulb className="mb-3 h-10 w-10 text-violet/70" />
              <p className="max-w-sm text-sm text-muted-foreground">Answer the questionnaire and generate diversified plan ideas tailored to your profile, goals and current holdings.</p>
            </Card>
          ) : (
            <motion.div key={plan.generatedAt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <Card className="border-violet/30">
                <CardHeader icon={<Sparkles />} title="Plan Ideas" subtitle={`Generated ${relativeTime(plan.generatedAt)}${plan.template ? " · template (add an AI key for personalized analysis)" : ""}`} action={<Badge variant={profile === "aggressive" ? "magenta" : profile === "moderate" ? "gold" : "success"}>{profile}</Badge>} />
                <p className="text-sm leading-relaxed">{plan.summary}</p>
                <div className="mt-5 grid items-center gap-6 md:grid-cols-[200px_1fr]">
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={plan.allocation} dataKey="percent" nameKey="bucket" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
                          {plan.allocation.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="space-y-2">
                    {plan.allocation.map((a, i) => (
                      <li key={a.bucket} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="font-medium">{a.bucket}</span>
                          <span className="ml-auto font-mono text-cyan">{a.percent}%</span>
                        </div>
                        <p className="pl-[18px] text-xs text-muted-foreground">{a.rationale}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {plan.ideas.map((idea, i) => (
                  <Card key={idea.title} delay={i * 0.05} className="p-4">
                    <p className="font-medium">{idea.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{idea.detail}</p>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-gold"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {idea.risk}</p>
                  </Card>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader icon={<RefreshCcw />} title="Rebalancing" />
                  <ul className="space-y-2 text-sm">{plan.rebalancing.map((r, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />{r}</li>)}</ul>
                </Card>
                <Card>
                  <CardHeader icon={<Scale />} title="Risk Notes" />
                  <ul className="space-y-2 text-sm">{plan.riskNotes.map((r, i) => <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-danger" />{r}</li>)}</ul>
                </Card>
              </div>
              <Disclaimer />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
