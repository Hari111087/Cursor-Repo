import { aiErrorResponse } from "@/lib/ai";
import { suggestFocusBlocks } from "@/lib/assistant";
import { route } from "@/lib/api";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** AI auto-scheduling: suggests focus blocks in today's free calendar gaps. Nothing is booked until Hari accepts. */
export const POST = route(
  async ({ userId }) => {
    try {
      return Response.json(await suggestFocusBlocks(userId));
    } catch (err) {
      return aiErrorResponse(err);
    }
  },
  { limit: 10 },
);
