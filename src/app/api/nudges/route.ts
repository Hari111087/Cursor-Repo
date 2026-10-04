import { buildNudges, todayContext } from "@/lib/assistant";
import { route } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = route(async ({ userId }) => {
  const { events, tasks } = await todayContext(userId);
  return Response.json({ nudges: buildNudges(events, tasks) });
});
