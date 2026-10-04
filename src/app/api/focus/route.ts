import { z } from "zod";
import { route } from "@/lib/api";
import { addFocusSession, listFocusSessions } from "@/lib/repo";

export const dynamic = "force-dynamic";

export const GET = route(async ({ req, userId }) => {
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") ?? 7), 90);
  return Response.json({ sessions: await listFocusSessions(userId, days) });
});

const Body = z.object({
  taskId: z.string().nullable().optional(),
  kind: z.enum(["focus", "break"]),
  minutes: z.number().int().min(1).max(240),
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
});

export const POST = route(async ({ req, userId }) => {
  const body = Body.parse(await req.json());
  return Response.json({ session: await addFocusSession(userId, body) }, { status: 201 });
});
