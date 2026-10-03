import { buildNudges, openTasks, todayContext } from "@/lib/assistant";
import { route } from "@/lib/api";
import { env } from "@/lib/env";
import { listInbox } from "@/lib/gmail";
import { getQuotes } from "@/lib/market";
import { getBriefing, listHoldings, listWatchlist } from "@/lib/repo";
import { dayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

/** Everything the Command Center needs in one round-trip. */
export const GET = route(async ({ userId }) => {
  const [{ events, tasks, calSource }, inbox, watch, holdings, briefing] = await Promise.all([
    todayContext(userId),
    listInbox(userId, { max: 15, query: "in:inbox is:unread newer_than:3d" }).catch(() => ({ emails: [], source: "error" as const })),
    listWatchlist(userId),
    listHoldings(userId),
    getBriefing(userId, dayKey()),
  ]);
  const quotes = await getQuotes(watch.slice(0, 6).map((w) => w.symbol));
  const holdingQuotes = await getQuotes(holdings.map((h) => h.symbol));
  const portfolio = holdings.reduce(
    (acc, h) => {
      const q = holdingQuotes.find((x) => x.symbol === h.symbol);
      const fx = h.currency === "INR" ? 1 / env.usdInr : 1;
      const price = q?.price ?? h.avgCost;
      acc.value += price * h.quantity * fx;
      acc.dayChange += (q?.change ?? 0) * h.quantity * fx;
      return acc;
    },
    { value: 0, dayChange: 0 },
  );
  return Response.json({
    events,
    calSource,
    emails: inbox.emails.filter((e) => e.category === "URGENT" || e.category === "IMPORTANT").slice(0, 5),
    unreadCount: inbox.emails.filter((e) => e.isUnread).length,
    emailSource: inbox.source,
    quotes,
    portfolio,
    priorities: openTasks(tasks).slice(0, 3),
    nudges: buildNudges(events, tasks),
    briefing,
  });
});
