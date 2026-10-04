import { z } from "zod";
import { route } from "@/lib/api";
import { sendPush } from "@/lib/push";
import { deletePushSub, savePushSub } from "@/lib/repo";

export const dynamic = "force-dynamic";

const Sub = z.object({ endpoint: z.string().url().startsWith("https://"), keys: z.object({ p256dh: z.string(), auth: z.string() }) });

export const POST = route(async ({ req, userId }) => {
  const body = await req.json();
  if (body?.test) {
    const res = await sendPush(userId, "nudge", { title: "Jarvis online ⚡", body: "Push notifications are working.", url: "/" }, { urgent: true });
    return Response.json(res);
  }
  const s = Sub.parse(body);
  await savePushSub(userId, { endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth });
  return Response.json({ ok: true }, { status: 201 });
}, { limit: 10 });

export const DELETE = route(async ({ req }) => {
  const { endpoint } = z.object({ endpoint: z.string().url() }).parse(await req.json());
  await deletePushSub(endpoint);
  return new Response(null, { status: 204 });
});
