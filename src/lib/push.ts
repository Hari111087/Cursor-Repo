import webpush from "web-push";
import { env } from "./env";
import { deletePushSub, getSettings, listPushSubs } from "./repo";
import { inQuietHours } from "./time";

let configured = false;
function configure() {
  if (configured || !env.hasPush) return env.hasPush;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
  return true;
}

export type PushKind = "email" | "market" | "nudge" | "briefing";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * Sends a push to all of the user's devices, honoring notification preferences and quiet hours.
 * `urgent` bypasses quiet hours (used for URGENT emails only).
 */
export async function sendPush(userId: string, kind: PushKind, payload: PushPayload, opts: { urgent?: boolean } = {}) {
  if (!configure()) return { sent: 0, skipped: "push-not-configured" as const };
  const s = await getSettings(userId);
  const enabled = { email: s.notifyEmail, market: s.notifyMarkets, nudge: s.notifyNudges, briefing: s.notifyBriefing }[kind];
  if (!enabled) return { sent: 0, skipped: "disabled" as const };
  if (s.quietHoursEnabled && !opts.urgent && inQuietHours(s.quietStart, s.quietEnd)) return { sent: 0, skipped: "quiet-hours" as const };

  const subs = await listPushSubs(userId);
  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...payload, kind }),
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await deletePushSub(sub.endpoint);
        else console.error("[push] send failed", code);
      }
    }),
  );
  return { sent };
}
