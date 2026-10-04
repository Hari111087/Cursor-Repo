import { z } from "zod";
import { route } from "@/lib/api";
import { getQuotes } from "@/lib/market";
import { SymbolSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export const GET = route(async ({ req }) => {
  const raw = (req.nextUrl.searchParams.get("symbols") ?? "").split(",").filter(Boolean).slice(0, 30);
  const symbols = z.array(SymbolSchema).parse(raw);
  return Response.json({ quotes: await getQuotes(symbols) });
});
