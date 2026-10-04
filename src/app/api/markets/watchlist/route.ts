import { z } from "zod";
import { route } from "@/lib/api";
import { isIndian } from "@/lib/market";
import { addWatch, listWatchlist, removeWatch } from "@/lib/repo";
import { SymbolSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async ({ userId }) => Response.json({ watchlist: await listWatchlist(userId) }));

export const POST = route(async ({ req, userId }) => {
  const { symbol, name } = z.object({ symbol: SymbolSchema, name: z.string().max(100).optional() }).parse(await req.json());
  return Response.json({ item: await addWatch(userId, { symbol, name: name ?? symbol, market: isIndian(symbol) ? "IN" : "US" }) }, { status: 201 });
});

export const DELETE = route(async ({ req, userId }) => {
  await removeWatch(userId, z.string().min(1).parse(req.nextUrl.searchParams.get("id")));
  return new Response(null, { status: 204 });
});
