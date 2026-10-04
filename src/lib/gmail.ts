import { z } from "zod";
import type { gmail_v1 } from "googleapis";
import { aiJson, untrusted } from "./ai";
import { env } from "./env";
import { getGoogleClient, gmailApi } from "./google";
import { mockEmails } from "./mock-data";
import { getEmailMetaMap, upsertEmailMeta } from "./repo";
import { sanitizeEmailHtml, toPlainText } from "./sanitize";
import type { EmailCategory, EmailDetail, EmailSummary } from "./types";

type Msg = gmail_v1.Schema$Message;
type Part = gmail_v1.Schema$MessagePart;

const header = (m: Msg, name: string) =>
  m.payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

const b64 = (data?: string | null) => (data ? Buffer.from(data, "base64url").toString("utf8") : "");

function findPart(part: Part | undefined, mime: string): Part | undefined {
  if (!part) return undefined;
  if (part.mimeType === mime && part.body?.data) return part;
  for (const p of part.parts ?? []) {
    const found = findPart(p, mime);
    if (found) return found;
  }
  return undefined;
}

function toSummary(m: Msg, category: EmailCategory, reason: string | null): EmailSummary {
  return {
    id: m.id!,
    threadId: m.threadId!,
    from: header(m, "From"),
    subject: header(m, "Subject") || "(no subject)",
    snippet: toPlainText(m.snippet ?? "", 300),
    receivedAt: new Date(Number(m.internalDate ?? Date.now())).toISOString(),
    category,
    reason,
    isUnread: (m.labelIds ?? []).includes("UNREAD"),
  };
}

// ── Classification ───────────────────────────────────────────────────────────
const ClassificationSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      category: z.enum(["URGENT", "IMPORTANT", "FYI", "PROMO"]),
      reason: z.string().describe("One short sentence explaining the category"),
    }),
  ),
});

/** Keyword heuristic used when AI is not configured or fails. */
export function heuristicCategory(e: Pick<EmailSummary, "from" | "subject" | "snippet">): EmailCategory {
  const t = `${e.subject} ${e.snippet}`.toLowerCase();
  if (/(urgent|asap|immediately|deadline|today|action required)/.test(t)) return "URGENT";
  if (/(unsubscribe|sale|% off|deal|offer|promo|newsletter)/.test(t) || /no-?reply|deals@|marketing@/.test(e.from.toLowerCase())) return "PROMO";
  if (/(invoice|meeting|review|contract|please|question|follow up|follow-up)/.test(t)) return "IMPORTANT";
  return "FYI";
}

export async function classifyEmails(emails: Pick<EmailSummary, "id" | "from" | "subject" | "snippet">[]) {
  const out = new Map<string, { category: EmailCategory; reason: string }>();
  if (emails.length === 0) return out;
  if (env.hasAI) {
    try {
      const list = emails.map((e) => `id: ${e.id}\nfrom: ${e.from}\nsubject: ${e.subject}\nsnippet: ${e.snippet}`).join("\n---\n");
      const res = await aiJson(ClassificationSchema, {
        system: `Classify Hari's emails. URGENT = needs action within ~24h or from a key person with a deadline. IMPORTANT = needs Hari's attention/decision but not today. FYI = informational, no action. PROMO = marketing, newsletters, sales.`,
        prompt: `Classify each email. Return one result per id.\n\n${untrusted("gmail", list)}`,
        effort: "low",
      });
      for (const r of res.results) out.set(r.id, { category: r.category, reason: r.reason });
    } catch (err) {
      console.error("[gmail] AI classification failed, using heuristic", err);
    }
  }
  for (const e of emails) if (!out.has(e.id)) out.set(e.id, { category: heuristicCategory(e), reason: "Keyword-based classification" });
  return out;
}

// ── Reading ──────────────────────────────────────────────────────────────────
export async function listInbox(userId: string, opts: { max?: number; query?: string } = {}): Promise<{ emails: EmailSummary[]; source: "gmail" | "mock" }> {
  const auth = await getGoogleClient(userId);
  if (!auth) return { emails: mockEmails().map(({ html: _h, text: _t, to: _to, messageIdHeader: _m, ...s }) => s), source: "mock" };

  const gmail = gmailApi(auth);
  const list = await gmail.users.messages.list({ userId: "me", maxResults: opts.max ?? 25, q: opts.query ?? "in:inbox newer_than:7d" });
  const ids = (list.data.messages ?? []).map((m) => m.id!).filter(Boolean);
  const msgs = await Promise.all(
    ids.map((id) =>
      gmail.users.messages
        .get({ userId: "me", id, format: "metadata", metadataHeaders: ["From", "Subject", "Date"] })
        .then((r) => r.data),
    ),
  );

  // Reuse cached classifications; classify only new messages.
  const cached = await getEmailMetaMap(userId, ids);
  const fresh = msgs.filter((m) => !cached.has(m.id!));
  const classified = await classifyEmails(fresh.map((m) => toSummary(m, "FYI", null)));

  const emails = msgs.map((m) => {
    const c = cached.get(m.id!) ?? classified.get(m.id!);
    return toSummary(m, (c?.category as EmailCategory) ?? "FYI", c?.reason ?? null);
  });
  await Promise.all(emails.filter((e) => !cached.has(e.id)).map((e) => upsertEmailMeta(userId, e)));
  return { emails, source: "gmail" };
}

export async function getEmail(userId: string, id: string): Promise<EmailDetail | null> {
  const auth = await getGoogleClient(userId);
  if (!auth) {
    const m = mockEmails().find((e) => e.id === id);
    return m ? { ...m, html: sanitizeEmailHtml(m.html) } : null;
  }
  const res = await gmailApi(auth).users.messages.get({ userId: "me", id, format: "full" });
  const m = res.data;
  const htmlPart = findPart(m.payload, "text/html");
  const textPart = findPart(m.payload, "text/plain");
  const rawHtml = htmlPart ? b64(htmlPart.body?.data) : "";
  const rawText = textPart ? b64(textPart.body?.data) : m.payload?.body?.data ? b64(m.payload.body.data) : "";
  const cached = (await getEmailMetaMap(userId, [id])).get(id);
  return {
    ...toSummary(m, (cached?.category as EmailCategory) ?? "FYI", cached?.reason ?? null),
    to: header(m, "To"),
    html: rawHtml ? sanitizeEmailHtml(rawHtml) : "",
    text: rawText ? toPlainText(rawText) : toPlainText(rawHtml),
    messageIdHeader: header(m, "Message-ID") || null,
  };
}

export async function getThreadText(userId: string, threadId: string): Promise<string> {
  const auth = await getGoogleClient(userId);
  if (!auth) {
    return mockEmails()
      .filter((e) => e.threadId === threadId)
      .map((e) => `From: ${e.from}\nSubject: ${e.subject}\n\n${e.text}`)
      .join("\n\n---\n\n");
  }
  const res = await gmailApi(auth).users.threads.get({ userId: "me", id: threadId, format: "full" });
  return (res.data.messages ?? [])
    .map((m) => {
      const textPart = findPart(m.payload, "text/plain") ?? findPart(m.payload, "text/html");
      const body = toPlainText(b64(textPart?.body?.data ?? m.payload?.body?.data), 8000);
      return `From: ${header(m, "From")}\nDate: ${header(m, "Date")}\nSubject: ${header(m, "Subject")}\n\n${body}`;
    })
    .join("\n\n---\n\n")
    .slice(0, 60_000);
}

// ── Sending (only ever called from the explicit approval endpoint) ───────────
const clean = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
const encodeHeader = (s: string) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`);

export function buildRawEmail(d: { to: string; cc?: string | null; subject: string; body: string; inReplyTo?: string | null }) {
  const headers = [
    `To: ${clean(d.to)}`,
    d.cc ? `Cc: ${clean(d.cc)}` : null,
    `Subject: ${encodeHeader(clean(d.subject))}`,
    d.inReplyTo ? `In-Reply-To: ${clean(d.inReplyTo)}` : null,
    d.inReplyTo ? `References: ${clean(d.inReplyTo)}` : null,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
  ].filter(Boolean);
  const raw = `${headers.join("\r\n")}\r\n\r\n${Buffer.from(d.body, "utf8").toString("base64")}`;
  return Buffer.from(raw, "utf8").toString("base64url");
}

export async function sendEmail(
  userId: string,
  d: { to: string; cc?: string | null; subject: string; body: string; inReplyTo?: string | null; threadId?: string | null },
) {
  const auth = await getGoogleClient(userId);
  if (!auth) return { id: `mock-sent-${Date.now()}`, mock: true };
  const res = await gmailApi(auth).users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawEmail(d), threadId: d.threadId ?? undefined },
  });
  return { id: res.data.id!, mock: false };
}
