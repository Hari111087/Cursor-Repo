import { z } from "zod";
import { aiErrorResponse, aiJson, untrusted } from "@/lib/ai";
import { route } from "@/lib/api";
import { getEmail, getThreadText } from "@/lib/gmail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SummarySchema = z.object({
  tldr: z.string().describe("One or two sentence summary"),
  keyPoints: z.array(z.string()),
  actionItems: z.array(z.string()).describe("What Hari needs to do, if anything"),
  suggestedReply: z.enum(["none", "brief", "detailed"]),
});

export const POST = route<{ id: string }>(
  async ({ userId, params }) => {
    const email = await getEmail(userId, params.id);
    if (!email) return Response.json({ error: "Not found" }, { status: 404 });
    try {
      const thread = await getThreadText(userId, email.threadId);
      const summary = await aiJson(SummarySchema, {
        system: "Summarize this email thread for Hari. Be specific about dates, amounts and asks.",
        prompt: untrusted("gmail-thread", thread || email.text),
        effort: "low",
      });
      return Response.json({ summary });
    } catch (err) {
      return aiErrorResponse(err);
    }
  },
  { limit: 20 },
);
