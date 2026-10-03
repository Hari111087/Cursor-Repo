import { buildNudges, generateBriefing, todayContext } from "./assistant";
import { env } from "./env";
import { listInbox } from "./gmail";
import { getQuote } from "./market";
import { prisma } from "./prisma";
import { sendPush } from "./push";
import { getSettings, listAllActiveAlerts, listJobUsers, updateAlert, upsertEmailMeta } from "./repo";
import { hhmmToMinutes, minutesOfDay } from "./time";

/** Background jobs. Called by Vercel Cron routes (/api/cron/*) or by `npm run worker`. */

export async function pollEmailJob() {
  if (env.demo) return { skipped: "demo" };
  const users = await listJobUsers();
  let notified = 0;
  for (const userId of users) {
    const settings = await getSettings(userId);
    const acct = await prisma.googleAccount.findUnique({ where: { userId } });
    if (!acct) continue;
    const since = acct.gmailLastCheckedAt ?? new Date(Date.now() - 10 * 60_000);
    const startedAt = new Date();
    const { emails } = await listInbox(userId, { max: 20, query: `in:inbox is:unread after:${Math.floor(since.getTime() / 1000)}` });
    const levels = { urgent: ["URGENT"], important: ["URGENT", "IMPORTANT"], all: ["URGENT", "IMPORTANT", "FYI", "PROMO"] }[settings.notifyEmailLevel];
    const existing = await prisma.emailMeta.findMany({ where: { id: { in: emails.map((e) => e.id) } }, select: { id: true, notifiedAt: true } });
    const alreadyNotified = new Set(existing.filter((e) => e.notifiedAt).map((e) => e.id));
    for (const e of emails) {
      if (alreadyNotified.has(e.id) || !levels.includes(e.category)) continue;
      const res = await sendPush(
        userId,
        "email",
        { title: `${e.category === "URGENT" ? "🔴 Urgent" : "📧 New"}: ${e.subject}`.slice(0, 120), body: `${e.from.replace(/<.*>/, "").trim()}: ${e.reason ?? e.snippet}`.slice(0, 200), url: `/email?id=${e.id}`, tag: e.id },
        { urgent: e.category === "URGENT" },
      );
      if (res.sent) notified++;
      await upsertEmailMeta(userId, { ...e, notifiedAt: new Date() });
    }
    await prisma.googleAccount.update({ where: { userId }, data: { gmailLastCheckedAt: startedAt } });
  }
  return { users: users.length, notified };
}

export async function checkAlertsJob() {
  const alerts = await listAllActiveAlerts();
  let triggered = 0;
  for (const a of alerts) {
    const q = await getQuote(a.symbol);
    const hit =
      (a.kind === "ABOVE" && q.price >= a.threshold) ||
      (a.kind === "BELOW" && q.price <= a.threshold) ||
      (a.kind === "PCT_UP" && q.changePct >= a.threshold) ||
      (a.kind === "PCT_DOWN" && q.changePct <= -Math.abs(a.threshold));
    if (!hit) continue;
    triggered++;
    const label = { ABOVE: `rose above ${a.threshold}`, BELOW: `fell below ${a.threshold}`, PCT_UP: `is up ${q.changePct.toFixed(2)}%`, PCT_DOWN: `is down ${q.changePct.toFixed(2)}%` }[a.kind];
    await sendPush(a.userId, "market", { title: `📈 ${a.symbol} ${label}`, body: `Now ${q.price.toFixed(2)} ${q.currency} (${q.changePct.toFixed(2)}% today)`, url: "/markets", tag: `alert-${a.id}` });
    // One-shot alerts: deactivate after firing so Hari isn't spammed.
    await updateAlert(a.userId, a.id, { active: false, triggeredAt: new Date() });
  }
  return { checked: alerts.length, triggered };
}

/** Generates the briefing once the user's configured briefing time has passed (idempotent per day). */
export async function morningBriefingJob() {
  const users = await listJobUsers();
  let generated = 0;
  for (const userId of users) {
    const s = await getSettings(userId);
    if (minutesOfDay() < hhmmToMinutes(s.briefingTime)) continue;
    try {
      const b = await generateBriefing(userId);
      if (Date.now() - new Date(b.generatedAt).getTime() < 5 * 60_000) {
        generated++;
        await sendPush(userId, "briefing", { title: "☀️ Your daily briefing is ready", body: b.headline, url: "/", tag: `briefing-${b.date}` });
      }
    } catch (err) {
      console.error("[jobs] briefing failed", err);
    }
  }
  return { generated };
}

export async function nudgeJob() {
  const users = await listJobUsers();
  for (const userId of users) {
    const { events, tasks } = await todayContext(userId);
    const [nudge] = buildNudges(events, tasks);
    if (nudge) await sendPush(userId, "nudge", { title: "💡 Nudge", body: nudge, url: "/time", tag: "nudge" });
  }
  return { users: users.length };
}
