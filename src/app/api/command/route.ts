import { z } from "zod";
import { aiErrorResponse, aiJson } from "@/lib/ai";
import { openTasks, todayContext } from "@/lib/assistant";
import { route } from "@/lib/api";
import { createEvent } from "@/lib/calendar";
import { env } from "@/lib/env";
import { createTask } from "@/lib/repo";
import { fmtTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({ text: z.string().min(1).max(2000) });

const CommandSchema = z.object({
  reply: z.string().describe("Short spoken-style answer, max 3 sentences"),
  action: z.object({
    type: z.enum(["none", "create_task", "create_event", "navigate"]),
    title: z.string().describe("Task or event title; empty when unused"),
    priority: z.enum(["P1", "P2", "P3", "P4"]),
    bucket: z.enum(["TODAY", "WEEK", "LATER"]),
    start: z.string().describe("ISO 8601 start for events; empty when unused"),
    end: z.string().describe("ISO 8601 end for events; empty when unused"),
    path: z.enum(["/", "/time", "/email", "/markets", "/settings"]),
  }),
});

/**
 * Natural-language command bar. Claude answers and may propose ONE safe action
 * (create task / calendar event / navigate). Emails are never sent from here.
 */
export const POST = route(
  async ({ req, userId }) => {
    const { text } = Body.parse(await req.json());
    if (!env.hasAI) {
      return Response.json({ reply: "My AI core is offline. Add an ANTHROPIC_API_KEY to enable commands. You can still use every module directly.", action: { type: "none" } });
    }
    try {
      const { events, tasks } = await todayContext(userId);
      const now = new Date();
      const res = await aiJson(CommandSchema, {
        system: `You are the command bar of Hari's assistant. Current time: ${now.toISOString()} (user timezone ${env.timezone}).
Available actions: create_task, create_event (only when Hari clearly asks to schedule something), navigate (to a module), or none.
You cannot send email, trade, or delete anything. For email requests, navigate to /email and say a draft must be reviewed there.
Unused action fields: empty strings, priority P3, bucket TODAY, path "/".`,
        prompt: `Today's events:\n${events.map((e) => `${fmtTime(e.start)} ${e.title}`).join("\n") || "none"}\nTop tasks:\n${openTasks(tasks).slice(0, 8).map((t) => `${t.priority} ${t.title}`).join("\n") || "none"}\n\nHari says: ${text}`,
        effort: "low",
      });

      const a = res.action;
      let result: unknown = null;
      if (a.type === "create_task" && a.title) result = await createTask(userId, { title: a.title, priority: a.priority, bucket: a.bucket });
      if (a.type === "create_event" && a.title && a.start && a.end) result = await createEvent(userId, { title: a.title, start: a.start, end: a.end });
      return Response.json({ reply: res.reply, action: a, result });
    } catch (err) {
      return aiErrorResponse(err);
    }
  },
  { limit: 20 },
);
