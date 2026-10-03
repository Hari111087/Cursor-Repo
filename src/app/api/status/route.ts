import { env } from "@/lib/env";
import { AI_MODEL } from "@/lib/ai";
import { route } from "@/lib/api";
import { getGoogleClient } from "@/lib/google";

export const dynamic = "force-dynamic";

/** Which integrations are live vs. mocked. Used by Settings → Connected accounts. */
export const GET = route(async ({ userId }) => {
  const google = env.demo ? false : Boolean(await getGoogleClient(userId).catch(() => null));
  return Response.json({
    demo: env.demo,
    google,
    googleConfigured: env.hasGoogle,
    ai: env.hasAI,
    aiModel: env.hasAI ? AI_MODEL : null,
    market: env.hasFinnhub ? "finnhub" : env.hasPolygon ? "polygon" : env.hasAlphaVantage ? "alphavantage" : "mock",
    push: env.hasPush,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
    timezone: env.timezone,
  });
});
