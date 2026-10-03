import { z } from "zod";
import { route } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/repo";

export const dynamic = "force-dynamic";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const Patch = z
  .object({
    theme: z.enum(["dark", "light", "system"]),
    voiceEnabled: z.boolean(),
    notifyEmail: z.boolean(),
    notifyEmailLevel: z.enum(["urgent", "important", "all"]),
    notifyMarkets: z.boolean(),
    notifyNudges: z.boolean(),
    notifyBriefing: z.boolean(),
    quietHoursEnabled: z.boolean(),
    quietStart: hhmm,
    quietEnd: hhmm,
    briefingTime: hhmm,
  })
  .partial()
  .strict();

export const GET = route(async ({ userId }) => Response.json({ settings: await getSettings(userId) }));

export const PATCH = route(async ({ req, userId }) => Response.json({ settings: await updateSettings(userId, Patch.parse(await req.json())) }));
