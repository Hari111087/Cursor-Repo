import { z } from "zod";
import { aiJson, untrusted } from "./ai";
import { freeGaps, listEvents } from "./calendar";
import { env } from "./env";
import { listInbox } from "./gmail";
import { getQuotes } from "./market";
import { mockBriefing } from "./mock-data";
import { getBriefing, listHoldings, listTasks, listWatchlist, saveBriefing } from "./repo";
import { dayKey, fmtTime, zonedAt } from "./time";
import type { Briefing, CalendarEvent, FocusSuggestion, Task } from "./types";

const PRIORITY_RANK = { P1: 0, P2: 1, P3: 2, P4: 3 } as const;
export const WORKDAY = { start: 9 * 60, end: 19 * 60 };

export function openTasks(tasks: Task[]) {
  return tasks
    .filter((t) => t.bucket !== "DONE")
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"));
}

export async function todayContext(userId: string) {
  const dayStart = zonedAt(0);
  const dayEnd = zonedAt(24 * 60);
  const [{ events, source: calSource }, tasks] = await Promise.all([listEvents(userId, dayStart, dayEnd), listTasks(userId)]);
  return { events, tasks, calSource };
}

// ── Daily briefing ───────────────────────────────────────────────────────────
const BriefingSchema = z.object({
  headline: z.string().describe("One sentence overview of the day"),
  sections: z.array(z.object({ title: z.enum(["Calendar", "Email", "Markets"]), points: z.array(z.string()) })),
  priorities: z.array(z.string()).describe("Exactly three top priorities for today"),
});

export async function generateBriefing(userId: string, opts: { force?: boolean } = {}): Promise<Briefing> {
  const date = dayKey();
  if (!opts.force) {
    const existing = await getBriefing(userId, date);
    if (existing) return existing;
  }
  const [{ events, tasks }, inbox, watch, holdings] = await Promise.all([
    todayContext(userId),
    listInbox(userId, { max: 20, query: "in:inbox is:unread newer_than:2d" }),
    listWatchlist(userId),
    listHoldings(userId),
  ]);
  const quotes = await getQuotes(Array.from(new Set([...watch.map((w) => w.symbol), ...holdings.map((h) => h.symbol)])).slice(0, 15));

  if (!env.hasAI) {
    const b = env.demo ? mockBriefing(date) : heuristicBriefing(date, events, tasks, inbox.emails.length);
    await saveBriefing(userId, b);
    return b;
  }

  const calendarText = events.map((e) => `${fmtTime(e.start)}–${fmtTime(e.end)} ${e.title}`).join("\n") || "No events";
  const gaps = freeGaps(events, zonedAt(WORKDAY.start), zonedAt(WORKDAY.end), 45).map((g) => `${fmtTime(g.start)}–${fmtTime(g.end)} (${g.minutes} min)`);
  const emailText = inbox.emails.slice(0, 15).map((e) => `[${e.category}] ${e.from}: ${e.subject} | ${e.snippet}`).join("\n");
  const marketText = quotes.map((q) => `${q.symbol} ${q.price.toFixed(2)} ${q.currency} (${q.changePct.toFixed(2)}%)`).join("\n");
  const pnl = holdings.reduce((acc, h) => {
    const q = quotes.find((x) => x.symbol === h.symbol);
    return acc + (q ? (q.change * h.quantity) / (h.currency === "INR" ? env.usdInr : 1) : 0);
  }, 0);
  const taskText = openTasks(tasks).slice(0, 10).map((t) => `${t.priority} ${t.title}${t.dueAt ? ` (due ${fmtTime(t.dueAt)})` : ""}`).join("\n");

  const res = await aiJson(BriefingSchema, {
    system: "Write Hari's morning briefing. Each point is one crisp sentence. Mention free gaps for deep work. Never give financial advice; describe market moves factually.",
    prompt: `Date: ${date} (${env.timezone})
Calendar today:\n${calendarText}
Free gaps: ${gaps.join(", ") || "none"}
Open tasks:\n${taskText || "none"}
Portfolio day change ≈ $${pnl.toFixed(0)}
Watchlist:\n${marketText}
Unread emails:\n${untrusted("gmail", emailText || "none")}`,
    effort: "medium",
  });
  const b: Briefing = { date, ...res, priorities: res.priorities.slice(0, 3), generatedAt: new Date().toISOString(), source: "ai" };
  await saveBriefing(userId, b);
  return b;
}

function heuristicBriefing(date: string, events: CalendarEvent[], tasks: Task[], unread: number): Briefing {
  const top = openTasks(tasks).slice(0, 3);
  return {
    date,
    headline: `${events.length} events and ${unread} unread emails today.`,
    sections: [
      { title: "Calendar", points: events.length ? events.map((e) => `${fmtTime(e.start)}: ${e.title}`) : ["Your calendar is clear."] },
      { title: "Email", points: [`${unread} unread emails in the last 2 days.`] },
      { title: "Markets", points: ["Add ANTHROPIC_API_KEY for an AI market summary."] },
    ],
    priorities: top.map((t) => t.title),
    generatedAt: new Date().toISOString(),
    source: "basic",
  };
}

// ── Auto-scheduling ──────────────────────────────────────────────────────────
const ScheduleSchema = z.object({
  blocks: z.array(z.object({ taskId: z.string(), title: z.string(), start: z.string().describe("ISO 8601"), end: z.string().describe("ISO 8601"), reason: z.string() })),
});

export async function suggestFocusBlocks(userId: string): Promise<{ suggestions: FocusSuggestion[]; source: "ai" | "heuristic" }> {
  const { events, tasks } = await todayContext(userId);
  const now = new Date();
  const workStart = zonedAt(WORKDAY.start);
  // Never suggest blocks in the past: start from now (rounded up to 5 min) once the workday has begun.
  const from = now > workStart ? new Date(Math.ceil(now.getTime() / 300_000) * 300_000) : workStart;
  const gaps = freeGaps(events, from, zonedAt(WORKDAY.end), 25);
  const candidates = openTasks(tasks).filter((t) => t.bucket === "TODAY" || t.bucket === "WEEK").slice(0, 8);
  if (!gaps.length || !candidates.length) return { suggestions: [], source: "heuristic" };

  if (env.hasAI) {
    try {
      const res = await aiJson(ScheduleSchema, {
        system: "You schedule focus blocks. Put the highest priority and most demanding tasks in the longest, earliest gaps. Blocks must lie entirely inside a free gap, must not overlap, and should be 25–120 minutes. Leave 10 minutes of buffer before meetings.",
        prompt: `Timezone: ${env.timezone}\nFree gaps (ISO):\n${gaps.map((g) => `${g.start.toISOString()} → ${g.end.toISOString()} (${g.minutes} min)`).join("\n")}\n\nTasks:\n${candidates.map((t) => `id=${t.id} | ${t.priority} | ${t.title} | est ${t.estimateMin} min${t.dueAt ? ` | due ${t.dueAt}` : ""}`).join("\n")}`,
        effort: "low",
      });
      const valid = res.blocks.filter((b) => {
        const s = new Date(b.start).getTime();
        const e = new Date(b.end).getTime();
        return e > s && gaps.some((g) => s >= g.start.getTime() && e <= g.end.getTime());
      });
      if (valid.length) return { suggestions: valid, source: "ai" };
    } catch (err) {
      console.error("[schedule] AI failed, falling back", err);
    }
  }

  // Greedy: highest priority first into the earliest gap that fits.
  const remaining = gaps.map((g) => ({ start: g.start.getTime(), end: g.end.getTime() }));
  const suggestions: FocusSuggestion[] = [];
  for (const t of candidates) {
    const len = Math.min(Math.max(t.estimateMin, 25), 120) * 60_000;
    const gap = remaining.find((g) => g.end - g.start >= len);
    if (!gap) continue;
    suggestions.push({ taskId: t.id, title: t.title, start: new Date(gap.start).toISOString(), end: new Date(gap.start + len).toISOString(), reason: `${t.priority} task that fits this ${Math.round((gap.end - gap.start) / 60_000)}-minute gap` });
    gap.start += len + 10 * 60_000;
  }
  return { suggestions, source: "heuristic" };
}

// ── Smart nudges ─────────────────────────────────────────────────────────────
export function buildNudges(events: CalendarEvent[], tasks: Task[], now = new Date()): string[] {
  const nudges: string[] = [];
  const top = openTasks(tasks).filter((t) => t.bucket === "TODAY");
  const workStart = zonedAt(WORKDAY.start);
  const workEnd = zonedAt(WORKDAY.end);
  const gaps = now < workEnd ? freeGaps(events, now > workStart ? now : workStart, workEnd, 30) : [];
  const next = gaps[0];
  if (next && top[0]) {
    const hrs = next.minutes >= 90 ? `${Math.round((next.minutes / 60) * 2) / 2} hours` : `${next.minutes} minutes`;
    const when = next.start.getTime() - now.getTime() < 5 * 60_000 ? "now" : `at ${fmtTime(next.start)}`;
    nudges.push(`You have ${hrs} free ${when} before ${fmtTime(next.end)}, so tackle "${top[0].title}".`);
  }
  const overdue = top.filter((t) => t.dueAt && new Date(t.dueAt) < now);
  if (overdue.length) nudges.push(`${overdue.length} task${overdue.length > 1 ? "s are" : " is"} overdue: "${overdue[0].title}".`);
  const upcoming = events.find((e) => {
    const diff = new Date(e.start).getTime() - now.getTime();
    return diff > 0 && diff <= 15 * 60_000;
  });
  if (upcoming) nudges.push(`"${upcoming.title}" starts at ${fmtTime(upcoming.start)}. Time to wrap up.`);
  if (!nudges.length && top.length === 0) nudges.push("Today's list is clear. Pull something from This Week?");
  return nudges;
}
