import { route } from "@/lib/api";
import { getEmail } from "@/lib/gmail";

export const dynamic = "force-dynamic";

/** Returns the message with HTML already sanitized server-side. The client also renders it in a sandboxed iframe. */
export const GET = route<{ id: string }>(async ({ userId, params }) => {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(params.id)) return Response.json({ error: "Bad id" }, { status: 400 });
  const email = await getEmail(userId, params.id);
  return email ? Response.json({ email }) : Response.json({ error: "Not found" }, { status: 404 });
});
