import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { getUserId, UnauthorizedError } from "./auth";
import { rateLimit } from "./rate-limit";

type Ctx<P> = { req: NextRequest; userId: string; params: P };

/**
 * Wraps an App Router handler with: auth, per-IP+route rate limiting, and uniform error handling.
 * `limit` is requests per minute (AI routes use a lower limit).
 */
export function route<P = Record<string, string>>(
  handler: (ctx: Ctx<P>) => Promise<Response>,
  opts: { limit?: number } = {},
) {
  return async (req: NextRequest, { params }: { params: P }) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.ip || "local";
    const rl = rateLimit(`${ip}:${req.method}:${req.nextUrl.pathname}`, opts.limit ?? 60);
    if (!rl.ok) {
      return Response.json(
        { error: "Too many requests" },
        { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } },
      );
    }
    try {
      const userId = await getUserId();
      return await handler({ req, userId, params });
    } catch (err) {
      if (err instanceof UnauthorizedError) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (err instanceof ZodError) return Response.json({ error: "Invalid request", issues: err.issues }, { status: 400 });
      console.error(`[api] ${req.method} ${req.nextUrl.pathname}`, err);
      return Response.json({ error: "Internal error" }, { status: 500 });
    }
  };
}

/** Guard for cron endpoints: requires `Authorization: Bearer $CRON_SECRET`. */
export function isCronAuthorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.DEMO_MODE === "true";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
