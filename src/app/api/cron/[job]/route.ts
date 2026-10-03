import { NextRequest } from "next/server";
import { isCronAuthorized } from "@/lib/api";
import { checkAlertsJob, morningBriefingJob, nudgeJob, pollEmailJob } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const JOBS: Record<string, () => Promise<unknown>> = {
  "poll-email": pollEmailJob,
  "check-alerts": checkAlertsJob,
  briefing: morningBriefingJob,
  nudges: nudgeJob,
};

/** Vercel Cron (GET) or the worker hits these with `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest, { params }: { params: { job: string } }) {
  if (!isCronAuthorized(req)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const job = JOBS[params.job];
  if (!job) return Response.json({ error: "Unknown job" }, { status: 404 });
  try {
    return Response.json({ job: params.job, result: await job() });
  } catch (err) {
    console.error(`[cron] ${params.job} failed`, err);
    return Response.json({ error: "Job failed" }, { status: 500 });
  }
}
