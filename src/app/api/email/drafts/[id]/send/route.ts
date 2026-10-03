import { z } from "zod";
import { route } from "@/lib/api";
import { draftChecksum } from "@/lib/checksum";
import { sendEmail } from "@/lib/gmail";
import { getDraft, updateDraft } from "@/lib/repo";

export const dynamic = "force-dynamic";

/**
 * The ONLY code path that sends email. It requires:
 *  - a PENDING draft owned by the user
 *  - an explicit `approved: true` from the UI's confirmation step
 *  - a checksum of the reviewed recipients/subject/body echoed back, so Hari approves exactly what is sent
 */
const Body = z.object({ approved: z.literal(true), bodyChecksum: z.string().min(1) });

export const POST = route<{ id: string }>(
  async ({ req, userId, params }) => {
    const parsed = Body.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return Response.json({ error: "Explicit approval is required to send." }, { status: 400 });

    const draft = await getDraft(userId, params.id);
    if (!draft || draft.status !== "PENDING") return Response.json({ error: "Draft not found or already handled" }, { status: 404 });
    if (draftChecksum(draft) !== parsed.data.bodyChecksum) {
      return Response.json({ error: "Draft changed since you reviewed it. Please review again." }, { status: 409 });
    }

    const sent = await sendEmail(userId, draft);
    await updateDraft(userId, draft.id, { status: "SENT", approvedAt: new Date(), sentAt: new Date() });
    return Response.json({ ok: true, messageId: sent.id, mock: sent.mock });
  },
  { limit: 10 },
);
