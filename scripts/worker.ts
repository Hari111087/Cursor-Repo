/**
 * Long-running background job runner for self-hosting (Railway, Fly, a VPS, or `npm run worker` locally).
 * On Vercel, use the cron entries in vercel.json instead; both call the same job functions.
 *
 *   every 2 min   → poll Gmail, classify, push notifications
 *   every 3 min   → check price alerts
 *   every 5 min   → morning briefing (fires once the user's briefing time has passed; idempotent per day)
 *   hourly 9–18   → smart nudge
 */
import { loadEnvConfig } from "@next/env";
import cron from "node-cron";

// Load .env / .env.local exactly like Next.js does, before any app module reads process.env.
loadEnvConfig(process.cwd());

const tz = process.env.APP_TIMEZONE || "UTC";
let running = new Set<string>();

function schedule(name: string, expr: string, job: () => Promise<unknown>) {
  cron.schedule(
    expr,
    async () => {
      if (running.has(name)) return; // never overlap the same job
      running.add(name);
      const t = Date.now();
      try {
        const result = await job();
        console.log(`[worker] ${name} ok in ${Date.now() - t}ms`, JSON.stringify(result));
      } catch (err) {
        console.error(`[worker] ${name} failed`, err);
      } finally {
        running.delete(name);
      }
    },
    { timezone: tz },
  );
  console.log(`[worker] scheduled ${name} (${expr}, ${tz})`);
}

async function main() {
  const { checkAlertsJob, morningBriefingJob, nudgeJob, pollEmailJob } = await import("../src/lib/jobs");
  schedule("poll-email", "*/2 * * * *", pollEmailJob);
  schedule("check-alerts", "*/3 * * * *", checkAlertsJob);
  schedule("briefing", "*/5 5-11 * * *", morningBriefingJob);
  schedule("nudges", "5 9-18 * * 1-5", nudgeJob);
}

void main();

process.on("SIGTERM", () => {
  console.log("[worker] shutting down");
  running = new Set();
  process.exit(0);
});
