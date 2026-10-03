import { z } from "zod";
import { route } from "@/lib/api";
import { createDraft, listDrafts } from "@/lib/repo";
import { EmailAddressList } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async ({ userId }) => Response.json({ drafts: await listDrafts(userId) }));

const Body = z.object({
  to: EmailAddressList,
  cc: EmailAddressList.nullable().optional(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(50_000),
  tone: z.enum(["formal", "friendly", "brief"]).default("friendly"),
});

/** Manually-written drafts also go through the approval queue. */
export const POST = route(async ({ req, userId }) => {
  const b = Body.parse(await req.json());
  return Response.json({ draft: await createDraft(userId, { ...b, cc: b.cc ?? null, inReplyTo: null, threadId: null }) }, { status: 201 });
});
