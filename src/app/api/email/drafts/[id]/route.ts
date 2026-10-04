import { z } from "zod";
import { route } from "@/lib/api";
import { updateDraft } from "@/lib/repo";
import { EmailAddressList } from "@/lib/schemas";

const Patch = z.object({
  to: EmailAddressList.optional(),
  cc: EmailAddressList.nullable().optional(),
  subject: z.string().min(1).max(300).optional(),
  body: z.string().min(1).max(50_000).optional(),
  tone: z.enum(["formal", "friendly", "brief"]).optional(),
});

export const PATCH = route<{ id: string }>(async ({ req, userId, params }) => {
  const draft = await updateDraft(userId, params.id, Patch.parse(await req.json()));
  return draft ? Response.json({ draft }) : Response.json({ error: "Not found" }, { status: 404 });
});

/** Discard (soft delete) a draft. */
export const DELETE = route<{ id: string }>(async ({ userId, params }) => {
  await updateDraft(userId, params.id, { status: "DISCARDED" });
  return new Response(null, { status: 204 });
});
