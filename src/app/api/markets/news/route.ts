import { route } from "@/lib/api";
import { getNews } from "@/lib/market";
import { SymbolSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = route(async ({ req }) => {
  const s = req.nextUrl.searchParams.get("symbol");
  return Response.json(await getNews(s ? SymbolSchema.parse(s) : undefined));
}, { limit: 20 });
