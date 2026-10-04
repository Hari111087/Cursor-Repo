import { z } from "zod";
import { route } from "@/lib/api";
import { addAlert, deleteAlert, listAlerts, updateAlert } from "@/lib/repo";
import { SymbolSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async ({ userId }) => Response.json({ alerts: await listAlerts(userId) }));

const Body = z.object({ symbol: SymbolSchema, kind: z.enum(["ABOVE", "BELOW", "PCT_UP", "PCT_DOWN"]), threshold: z.number().positive().max(1e7) });

export const POST = route(async ({ req, userId }) => {
  return Response.json({ alert: await addAlert(userId, Body.parse(await req.json())) }, { status: 201 });
});

export const PATCH = route(async ({ req, userId }) => {
  const { id, active } = z.object({ id: z.string().min(1), active: z.boolean() }).parse(await req.json());
  await updateAlert(userId, id, { active, ...(active ? { triggeredAt: null } : {}) });
  return Response.json({ ok: true });
});

export const DELETE = route(async ({ req, userId }) => {
  await deleteAlert(userId, z.string().min(1).parse(req.nextUrl.searchParams.get("id")));
  return new Response(null, { status: 204 });
});
