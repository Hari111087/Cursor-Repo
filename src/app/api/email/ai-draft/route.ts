import { z } from "zod";
import { aiErrorResponse, aiJson, untrusted } from "@/lib/ai";
import { env } from "@/lib/env";
import { route } from "@/lib/api";
import { getEmail, getThreadText } from "@/lib/gmail";
import { createDraft } from "@/lib/repo";
import { EmailAddressList } from "@/lib/schemas";
import { OWNER_NAME } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("reply"), emailId: z.string().min(1).max(64), tone: z.enum(["formal", "friendly", "brief"]), instructions: z.string().max(2000).default("") }),
  z.object({ mode: z.literal("compose"), to: EmailAddressList, subject: z.string().max(300).default(""), tone: z.enum(["formal", "friendly", "brief"]), instructions: z.string().min(1).max(2000) }),
]);

const DraftSchema = z.object({ subject: z.string(), body: z.string().describe("Plain-text email body including greeting and sign-off") });

const TONES = {
  formal: "formal and polished, complete sentences, professional sign-off",
  friendly: "warm and friendly but professional, conversational",
  brief: "very brief: 1–3 short sentences, no fluff",
};

/**
 * Generates a draft and stores it in the approval queue (status PENDING).
 * This endpoint NEVER sends email. Sending requires POST /api/email/drafts/:id/send with explicit approval.
 */
export const POST = route(
  async ({ req, userId }) => {
    const body = Body.parse(await req.json());
    if (!env.hasAI) return templateDraft(userId, body);
    try {
      if (body.mode === "reply") {
        const email = await getEmail(userId, body.emailId);
        if (!email) return Response.json({ error: "Email not found" }, { status: 404 });
        const thread = await getThreadText(userId, email.threadId);
        const out = await aiJson(DraftSchema, {
          system: `Draft a reply as ${OWNER_NAME}. Tone: ${TONES[body.tone]}. Don't invent facts, commitments or dates; use [placeholders] where info is missing. Sign as ${OWNER_NAME}.`,
          prompt: `${untrusted("gmail-thread", thread || email.text)}\n\nHari's instructions for the reply: ${body.instructions || "(none: write a sensible reply)"}`,
          effort: "low",
        });
        const draft = await createDraft(userId, {
          to: email.from,
          subject: email.subject.toLowerCase().startsWith("re:") ? email.subject : `Re: ${email.subject}`,
          body: out.body,
          tone: body.tone,
          inReplyTo: email.messageIdHeader ?? null,
          threadId: email.threadId,
        });
        return Response.json({ draft }, { status: 201 });
      }
      const out = await aiJson(DraftSchema, {
        system: `Compose a new email as ${OWNER_NAME}. Tone: ${TONES[body.tone]}. Don't invent facts; use [placeholders]. Sign as ${OWNER_NAME}.`,
        prompt: `To: ${body.to}\nSubject hint: ${body.subject || "(write one)"}\nWhat Hari wants to say: ${body.instructions}`,
        effort: "low",
      });
      const draft = await createDraft(userId, { to: body.to, subject: body.subject || out.subject, body: out.body, tone: body.tone, inReplyTo: null, threadId: null });
      return Response.json({ draft }, { status: 201 });
    } catch (err) {
      return aiErrorResponse(err);
    }
  },
  { limit: 15 },
);

/** Without an AI key, still create an editable draft so the review/approve flow works. */
async function templateDraft(userId: string, body: z.infer<typeof Body>) {
  const note = body.instructions || "[write your reply here]";
  if (body.mode === "reply") {
    const email = await getEmail(userId, body.emailId);
    if (!email) return Response.json({ error: "Email not found" }, { status: 404 });
    const name = email.from.replace(/<.*>/, "").trim().split(" ")[0] || "there";
    const draft = await createDraft(userId, {
      to: email.from,
      subject: email.subject.toLowerCase().startsWith("re:") ? email.subject : `Re: ${email.subject}`,
      body: `Hi ${name},\n\n${note}\n\nBest,\n${OWNER_NAME}`,
      tone: body.tone,
      inReplyTo: email.messageIdHeader ?? null,
      threadId: email.threadId,
    });
    return Response.json({ draft, template: true }, { status: 201 });
  }
  const draft = await createDraft(userId, { to: body.to, subject: body.subject || "(no subject)", body: `Hi,\n\n${note}\n\nBest,\n${OWNER_NAME}`, tone: body.tone, inReplyTo: null, threadId: null });
  return Response.json({ draft, template: true }, { status: 201 });
}
