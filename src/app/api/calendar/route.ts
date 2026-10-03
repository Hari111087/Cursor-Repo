import { z } from "zod";
import { route } from "@/lib/api";
import { createEvent, listEvents } from "@/lib/calendar";
import { zonedAt } from "@/lib/time";

export const dynamic = "force-dynamic";

export const GET = route(async ({ req, userId }) => {
  const days = Math.min(Number(req.nextUrl.searchParams.get("days") ?? 1), 14);
  return Response.json(await listEvents(userId, zonedAt(0), zonedAt(24 * 60, days - 1)));
});

const Body = z.object({
  title: z.string().min(1).max(200),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  description: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
});

export const POST = route(async ({ req, userId }) => {
  const body = Body.parse(await req.json());
  if (new Date(body.end) <= new Date(body.start)) return Response.json({ error: "End must be after start" }, { status: 400 });
  return Response.json({ event: await createEvent(userId, body) }, { status: 201 });
});
