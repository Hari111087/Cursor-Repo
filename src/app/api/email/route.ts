import { route } from "@/lib/api";
import { listInbox } from "@/lib/gmail";
import { listDrafts } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export const GET = route(async ({ req, userId }) => {
  const q = req.nextUrl.searchParams.get("q");
  const [inbox, drafts] = await Promise.all([
    listInbox(userId, { max: 30, query: q ? `in:inbox ${q.slice(0, 200)}` : undefined }),
    listDrafts(userId),
  ]);
  return Response.json({ ...inbox, drafts });
});
