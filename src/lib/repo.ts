import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { env } from "./env";
import { prisma } from "./prisma";
import * as mock from "./mock-data";
import type {
  Briefing, EmailDraft, EmailSummary, FocusSession, Holding, InsightPlan, PriceAlert, RiskProfile, Settings, Task, WatchItem,
} from "./types";

/**
 * Data access layer. In DEMO_MODE (or with no DATABASE_URL) everything lives in an
 * in-memory store seeded with mock data; otherwise Prisma/PostgreSQL is used.
 */

export const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  voiceEnabled: true,
  notifyEmail: true,
  notifyEmailLevel: "important",
  notifyMarkets: true,
  notifyNudges: true,
  notifyBriefing: true,
  quietHoursEnabled: true,
  quietStart: "22:00",
  quietEnd: "07:00",
  briefingTime: "07:30",
};

interface MemStore {
  tasks: Task[];
  focus: FocusSession[];
  settings: Settings;
  watchlist: WatchItem[];
  alerts: PriceAlert[];
  holdings: Holding[];
  risk: RiskProfile | null;
  insight: InsightPlan | null;
  drafts: EmailDraft[];
  briefings: Record<string, Briefing>;
  push: { endpoint: string; p256dh: string; auth: string }[];
}

const g = globalThis as unknown as { __mem?: MemStore };
function mem(): MemStore {
  return (g.__mem ??= {
    tasks: mock.mockTasks(),
    focus: mock.mockFocusSessions(),
    settings: { ...DEFAULT_SETTINGS },
    watchlist: mock.mockWatchlist(),
    alerts: mock.mockAlerts(),
    holdings: mock.mockHoldings(),
    risk: null,
    insight: null,
    drafts: [],
    briefings: {},
    push: [],
  });
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

// ── Tasks ────────────────────────────────────────────────────────────────────
type TaskRow = Prisma.TaskGetPayload<object>;
const toTask = (t: TaskRow): Task => ({
  id: t.id, title: t.title, notes: t.notes, priority: t.priority, bucket: t.bucket, tags: t.tags,
  dueAt: iso(t.dueAt), estimateMin: t.estimateMin, completedAt: iso(t.completedAt), order: t.order, createdAt: t.createdAt.toISOString(),
});

export type TaskInput = Partial<Pick<Task, "title" | "notes" | "priority" | "bucket" | "tags" | "dueAt" | "estimateMin" | "order">>;

export async function listTasks(userId: string): Promise<Task[]> {
  if (env.demo) return [...mem().tasks].sort((a, b) => a.order - b.order);
  const rows = await prisma.task.findMany({ where: { userId }, orderBy: [{ bucket: "asc" }, { order: "asc" }] });
  return rows.map(toTask);
}

export async function createTask(userId: string, input: TaskInput & { title: string }): Promise<Task> {
  if (env.demo) {
    const t: Task = {
      id: randomUUID(), title: input.title, notes: input.notes ?? null, priority: input.priority ?? "P3", bucket: input.bucket ?? "TODAY",
      tags: input.tags ?? [], dueAt: input.dueAt ?? null, estimateMin: input.estimateMin ?? 30, completedAt: null,
      order: input.order ?? mem().tasks.length, createdAt: new Date().toISOString(),
    };
    mem().tasks.push(t);
    return t;
  }
  const row = await prisma.task.create({
    data: {
      userId, title: input.title, notes: input.notes, priority: input.priority, bucket: input.bucket, tags: input.tags ?? [],
      dueAt: input.dueAt ? new Date(input.dueAt) : null, estimateMin: input.estimateMin, order: input.order ?? 0,
    },
  });
  return toTask(row);
}

export async function updateTask(userId: string, id: string, input: TaskInput): Promise<Task | null> {
  const completedAt = input.bucket === "DONE" ? new Date() : input.bucket ? null : undefined;
  if (env.demo) {
    const t = mem().tasks.find((x) => x.id === id);
    if (!t) return null;
    Object.assign(t, input, completedAt !== undefined ? { completedAt: completedAt?.toISOString() ?? null } : {});
    return t;
  }
  const found = await prisma.task.findFirst({ where: { id, userId } });
  if (!found) return null;
  const row = await prisma.task.update({
    where: { id },
    data: {
      ...input,
      dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
  return toTask(row);
}

export async function deleteTask(userId: string, id: string) {
  if (env.demo) {
    mem().tasks = mem().tasks.filter((t) => t.id !== id);
    return;
  }
  await prisma.task.deleteMany({ where: { id, userId } });
}

// ── Focus sessions ───────────────────────────────────────────────────────────
export async function listFocusSessions(userId: string, sinceDays = 7): Promise<FocusSession[]> {
  const since = new Date(Date.now() - sinceDays * 86_400_000);
  if (env.demo) return mem().focus.filter((f) => new Date(f.startedAt) >= since);
  const rows = await prisma.focusSession.findMany({ where: { userId, startedAt: { gte: since } }, orderBy: { startedAt: "asc" } });
  return rows.map((r) => ({ id: r.id, taskId: r.taskId, kind: r.kind as "focus" | "break", minutes: r.minutes, startedAt: r.startedAt.toISOString(), endedAt: r.endedAt.toISOString() }));
}

export async function addFocusSession(userId: string, s: Omit<FocusSession, "id">) {
  if (env.demo) {
    const f = { ...s, id: randomUUID() };
    mem().focus.push(f);
    return f;
  }
  const r = await prisma.focusSession.create({ data: { userId, taskId: s.taskId, kind: s.kind, minutes: s.minutes, startedAt: new Date(s.startedAt), endedAt: new Date(s.endedAt) } });
  return { ...s, id: r.id };
}

// ── Settings ─────────────────────────────────────────────────────────────────
export async function getSettings(userId: string): Promise<Settings> {
  if (env.demo) return mem().settings;
  const s = await prisma.settings.findUnique({ where: { userId } });
  if (!s) return DEFAULT_SETTINGS;
  const { id: _id, userId: _u, updatedAt: _t, ...rest } = s;
  return rest as Settings;
}

export async function updateSettings(userId: string, patch: Partial<Settings>): Promise<Settings> {
  if (env.demo) return Object.assign(mem().settings, patch);
  await prisma.settings.upsert({ where: { userId }, update: patch, create: { userId, ...patch } });
  return getSettings(userId);
}

// ── Watchlist ────────────────────────────────────────────────────────────────
export async function listWatchlist(userId: string): Promise<WatchItem[]> {
  if (env.demo) return mem().watchlist;
  const rows = await prisma.watchlistItem.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, symbol: r.symbol, name: r.name, market: r.market as "US" | "IN" }));
}

export async function addWatch(userId: string, w: Omit<WatchItem, "id">) {
  if (env.demo) {
    const existing = mem().watchlist.find((x) => x.symbol === w.symbol);
    if (existing) return existing;
    const item = { ...w, id: randomUUID() };
    mem().watchlist.push(item);
    return item;
  }
  const r = await prisma.watchlistItem.upsert({ where: { userId_symbol: { userId, symbol: w.symbol } }, update: {}, create: { userId, ...w } });
  return { id: r.id, symbol: r.symbol, name: r.name, market: r.market as "US" | "IN" };
}

export async function removeWatch(userId: string, id: string) {
  if (env.demo) {
    mem().watchlist = mem().watchlist.filter((w) => w.id !== id);
    return;
  }
  await prisma.watchlistItem.deleteMany({ where: { id, userId } });
}

// ── Alerts ───────────────────────────────────────────────────────────────────
export async function listAlerts(userId: string): Promise<PriceAlert[]> {
  if (env.demo) return mem().alerts;
  const rows = await prisma.priceAlert.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({ id: r.id, symbol: r.symbol, kind: r.kind as PriceAlert["kind"], threshold: r.threshold, active: r.active, triggeredAt: iso(r.triggeredAt), createdAt: r.createdAt.toISOString() }));
}

export async function listAllActiveAlerts() {
  if (env.demo) return mem().alerts.filter((a) => a.active).map((a) => ({ ...a, userId: "demo-user" }));
  const rows = await prisma.priceAlert.findMany({ where: { active: true } });
  return rows.map((r) => ({ id: r.id, userId: r.userId, symbol: r.symbol, kind: r.kind as PriceAlert["kind"], threshold: r.threshold, active: r.active, createdAt: r.createdAt.toISOString() }));
}

export async function addAlert(userId: string, a: Pick<PriceAlert, "symbol" | "kind" | "threshold">) {
  if (env.demo) {
    const alert: PriceAlert = { ...a, id: randomUUID(), active: true, createdAt: new Date().toISOString() };
    mem().alerts.unshift(alert);
    return alert;
  }
  const r = await prisma.priceAlert.create({ data: { userId, ...a } });
  return { ...a, id: r.id, active: true, createdAt: r.createdAt.toISOString() };
}

export async function updateAlert(userId: string, id: string, patch: { active?: boolean; triggeredAt?: Date | null }) {
  if (env.demo) {
    const a = mem().alerts.find((x) => x.id === id);
    if (a) Object.assign(a, { ...patch, triggeredAt: patch.triggeredAt === undefined ? a.triggeredAt : iso(patch.triggeredAt) });
    return;
  }
  await prisma.priceAlert.updateMany({ where: { id, userId }, data: patch });
}

export async function deleteAlert(userId: string, id: string) {
  if (env.demo) {
    mem().alerts = mem().alerts.filter((a) => a.id !== id);
    return;
  }
  await prisma.priceAlert.deleteMany({ where: { id, userId } });
}

// ── Holdings ─────────────────────────────────────────────────────────────────
export async function listHoldings(userId: string): Promise<Holding[]> {
  if (env.demo) return mem().holdings;
  const rows = await prisma.holding.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return rows.map((r) => ({ id: r.id, symbol: r.symbol, name: r.name, quantity: r.quantity, avgCost: r.avgCost, currency: r.currency, sector: r.sector }));
}

export async function addHolding(userId: string, h: Omit<Holding, "id">) {
  if (env.demo) {
    const item = { ...h, id: randomUUID() };
    mem().holdings.push(item);
    return item;
  }
  const r = await prisma.holding.create({ data: { userId, ...h } });
  return { ...h, id: r.id };
}

export async function deleteHolding(userId: string, id: string) {
  if (env.demo) {
    mem().holdings = mem().holdings.filter((h) => h.id !== id);
    return;
  }
  await prisma.holding.deleteMany({ where: { id, userId } });
}

// ── Risk profile & insights ──────────────────────────────────────────────────
export async function getRiskProfile(userId: string): Promise<RiskProfile | null> {
  if (env.demo) return mem().risk;
  const r = await prisma.riskProfile.findUnique({ where: { userId } });
  return r ? { profile: r.profile as RiskProfile["profile"], answers: r.answers as Record<string, string>, goals: r.goals, horizonYears: r.horizonYears } : null;
}

export async function saveRiskProfile(userId: string, p: RiskProfile) {
  if (env.demo) {
    mem().risk = p;
    return p;
  }
  await prisma.riskProfile.upsert({ where: { userId }, update: p, create: { userId, ...p } });
  return p;
}

export async function getLatestInsight(userId: string): Promise<InsightPlan | null> {
  if (env.demo) return mem().insight;
  const r = await prisma.insight.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  return (r?.content as unknown as InsightPlan) ?? null;
}

export async function saveInsight(userId: string, plan: InsightPlan) {
  if (env.demo) {
    mem().insight = plan;
    return;
  }
  await prisma.insight.create({ data: { userId, content: plan as unknown as Prisma.InputJsonValue } });
}

// ── Email drafts (approval queue) ────────────────────────────────────────────
type DraftRow = Prisma.EmailDraftGetPayload<object>;
const toDraft = (d: DraftRow): EmailDraft => ({
  id: d.id, to: d.to, cc: d.cc, subject: d.subject, body: d.body, tone: d.tone as EmailDraft["tone"], inReplyTo: d.inReplyTo,
  threadId: d.threadId, status: d.status as EmailDraft["status"], createdAt: d.createdAt.toISOString(), sentAt: iso(d.sentAt),
});

export async function listDrafts(userId: string): Promise<EmailDraft[]> {
  if (env.demo) return mem().drafts.filter((d) => d.status === "PENDING");
  const rows = await prisma.emailDraft.findMany({ where: { userId, status: "PENDING" }, orderBy: { createdAt: "desc" } });
  return rows.map(toDraft);
}

export async function getDraft(userId: string, id: string): Promise<EmailDraft | null> {
  if (env.demo) return mem().drafts.find((d) => d.id === id) ?? null;
  const r = await prisma.emailDraft.findFirst({ where: { id, userId } });
  return r ? toDraft(r) : null;
}

export async function createDraft(userId: string, d: Omit<EmailDraft, "id" | "status" | "createdAt" | "sentAt">) {
  if (env.demo) {
    const draft: EmailDraft = { ...d, id: randomUUID(), status: "PENDING", createdAt: new Date().toISOString(), sentAt: null };
    mem().drafts.unshift(draft);
    return draft;
  }
  return toDraft(await prisma.emailDraft.create({ data: { userId, ...d } }));
}

export async function updateDraft(userId: string, id: string, patch: Partial<Pick<EmailDraft, "to" | "cc" | "subject" | "body" | "tone" | "status">> & { sentAt?: Date; approvedAt?: Date }) {
  if (env.demo) {
    const d = mem().drafts.find((x) => x.id === id);
    if (!d) return null;
    Object.assign(d, { ...patch, sentAt: patch.sentAt ? patch.sentAt.toISOString() : d.sentAt });
    return d;
  }
  const found = await prisma.emailDraft.findFirst({ where: { id, userId } });
  if (!found) return null;
  return toDraft(await prisma.emailDraft.update({ where: { id }, data: patch }));
}

// ── Email metadata (classification cache) ────────────────────────────────────
export async function listEmailMeta(userId: string, limit = 50): Promise<EmailSummary[]> {
  if (env.demo) return mock.mockEmails();
  const rows = await prisma.emailMeta.findMany({ where: { userId }, orderBy: { receivedAt: "desc" }, take: limit });
  return rows.map((r) => ({ id: r.id, threadId: r.threadId, from: r.from, subject: r.subject, snippet: r.snippet, receivedAt: r.receivedAt.toISOString(), category: r.category as EmailSummary["category"], reason: r.reason, isUnread: r.isUnread }));
}

export async function getEmailMetaMap(userId: string, ids: string[]) {
  if (env.demo || ids.length === 0) return new Map<string, { category: string; reason: string | null; notifiedAt: Date | null }>();
  const rows = await prisma.emailMeta.findMany({ where: { userId, id: { in: ids } } });
  return new Map(rows.map((r) => [r.id, { category: r.category, reason: r.reason, notifiedAt: r.notifiedAt }]));
}

export async function upsertEmailMeta(userId: string, e: EmailSummary & { notifiedAt?: Date | null }) {
  if (env.demo) return;
  const data = { threadId: e.threadId, from: e.from, subject: e.subject, snippet: e.snippet, receivedAt: new Date(e.receivedAt), category: e.category, reason: e.reason, isUnread: e.isUnread, notifiedAt: e.notifiedAt ?? undefined };
  await prisma.emailMeta.upsert({ where: { id: e.id }, update: data, create: { id: e.id, userId, ...data } });
}

// ── Briefings ────────────────────────────────────────────────────────────────
export async function getBriefing(userId: string, date: string): Promise<Briefing | null> {
  if (env.demo) return mem().briefings[date] ?? null;
  const r = await prisma.briefing.findUnique({ where: { userId_date: { userId, date } } });
  return (r?.content as unknown as Briefing) ?? null;
}

export async function saveBriefing(userId: string, b: Briefing) {
  if (env.demo) {
    mem().briefings[b.date] = b;
    return;
  }
  const content = b as unknown as Prisma.InputJsonValue;
  await prisma.briefing.upsert({ where: { userId_date: { userId, date: b.date } }, update: { content }, create: { userId, date: b.date, content } });
}

// ── Push subscriptions ───────────────────────────────────────────────────────
export async function savePushSub(userId: string, s: { endpoint: string; p256dh: string; auth: string }) {
  if (env.demo) {
    if (!mem().push.some((p) => p.endpoint === s.endpoint)) mem().push.push(s);
    return;
  }
  await prisma.pushSubscription.upsert({ where: { endpoint: s.endpoint }, update: { userId, p256dh: s.p256dh, auth: s.auth }, create: { userId, ...s } });
}

export async function listPushSubs(userId: string) {
  if (env.demo) return mem().push;
  return prisma.pushSubscription.findMany({ where: { userId } });
}

export async function deletePushSub(endpoint: string) {
  if (env.demo) {
    mem().push = mem().push.filter((p) => p.endpoint !== endpoint);
    return;
  }
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

/** Users the background jobs should process. */
export async function listJobUsers(): Promise<string[]> {
  if (env.demo) return ["demo-user"];
  const rows = await prisma.user.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}
