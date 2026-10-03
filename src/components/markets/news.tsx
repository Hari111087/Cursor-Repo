"use client";
import { ExternalLink, Newspaper, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { useApi } from "@/lib/client";
import type { NewsItem } from "@/lib/types";
import { relativeTime } from "@/lib/utils";

const SENTIMENT = {
  bullish: { variant: "success", icon: TrendingUp },
  bearish: { variant: "danger", icon: TrendingDown },
  neutral: { variant: "muted", icon: Minus },
} as const;

export function NewsFeed({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useApi<{ news: NewsItem[]; source: string }>("/api/markets/news", { refreshMs: 600_000 });
  return (
    <Card>
      <CardHeader icon={<Newspaper />} title="Market News" subtitle={data?.source === "mock" ? "Sample headlines · AI sentiment" : "AI sentiment tags"} />
      {loading ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-16" />)}</div>
      ) : (
        <ul className="space-y-3">
          {(data?.news ?? []).slice(0, compact ? 5 : 15).map((n) => {
            const s = SENTIMENT[n.sentiment ?? "neutral"];
            return (
              <li key={n.id} className="rounded-md border border-transparent p-2 transition-colors hover:border-cyan/20 hover:bg-cyan/5">
                <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="block">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <Badge variant={s.variant}><s.icon className="h-3 w-3" />{n.sentiment}</Badge>
                    {n.symbols?.slice(0, 3).map((x) => <span key={x} className="font-display text-[10px] tracking-wider text-cyan">{x}</span>)}
                    <span className="ml-auto text-[11px] text-muted-foreground">{n.source} · {relativeTime(n.datetime)}</span>
                  </div>
                  <p className="text-sm font-medium leading-snug">{n.headline} <ExternalLink className="inline h-3 w-3 opacity-50" /></p>
                  {!compact && n.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{n.summary}</p>}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
