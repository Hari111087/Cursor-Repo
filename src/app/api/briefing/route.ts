import { aiErrorResponse } from "@/lib/ai";
import { generateBriefing } from "@/lib/assistant";
import { route } from "@/lib/api";
import { getBriefing } from "@/lib/repo";
import { dayKey } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = route(async ({ userId }) => Response.json({ briefing: await getBriefing(userId, dayKey()) }));

export const POST = route(
  async ({ userId }) => {
    try {
      return Response.json({ briefing: await generateBriefing(userId, { force: true }) });
    } catch (err) {
      return aiErrorResponse(err);
    }
  },
  { limit: 6 },
);
