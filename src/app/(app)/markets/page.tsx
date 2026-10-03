"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bell, Brain, Briefcase, LineChart, Newspaper } from "lucide-react";
import { Alerts } from "@/components/markets/alerts";
import { Insights } from "@/components/markets/insights";
import { NewsFeed } from "@/components/markets/news";
import { Portfolio } from "@/components/markets/portfolio";
import { useLiveQuotes } from "@/components/markets/use-live-quotes";
import { Watchlist } from "@/components/markets/watchlist";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, useApi } from "@/lib/client";
import type { PriceAlert, WatchItem } from "@/lib/types";

export default function MarketsPage() {
  return (
    <Suspense>
      <Markets />
    </Suspense>
  );
}

function Markets() {
  const params = useSearchParams();
  const [tab, setTab] = useState(params.get("tab") ?? "watchlist");
  const watch = useApi<{ watchlist: WatchItem[] }>("/api/markets/watchlist");
  const alerts = useApi<{ alerts: PriceAlert[] }>("/api/markets/alerts");
  const items = watch.data?.watchlist ?? [];
  const { quotes, connected } = useLiveQuotes(items.map((w) => w.symbol));
  const [prefill, setPrefill] = useState<{ symbol: string; price: number } | null>(null);

  return (
    <div>
      <PageHeader title="Market Monitor" subtitle="US & Indian markets · live prices, alerts, portfolio and AI insights. Trades are never placed." />
      <Tabs value={tab} onValueChange={setTab}>
        <div className="mb-6 overflow-x-auto scrollbar-thin">
          <TabsList>
            <TabsTrigger value="watchlist"><LineChart /> Watchlist</TabsTrigger>
            <TabsTrigger value="portfolio"><Briefcase /> Portfolio</TabsTrigger>
            <TabsTrigger value="alerts"><Bell /> Alerts</TabsTrigger>
            <TabsTrigger value="news"><Newspaper /> News</TabsTrigger>
            <TabsTrigger value="insights"><Brain /> AI Insights</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="watchlist">
          <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
            {watch.loading ? (
              <div className="skeleton h-96" />
            ) : (
              <Watchlist
                items={items}
                quotes={quotes}
                connected={connected}
                onAdd={(w) => watch.mutate((d) => ({ watchlist: [...(d?.watchlist ?? []).filter((x) => x.id !== w.id), w] }))}
                onRemove={async (id) => {
                  watch.mutate((d) => ({ watchlist: (d?.watchlist ?? []).filter((x) => x.id !== id) }));
                  await api(`/api/markets/watchlist?id=${id}`, { method: "DELETE" });
                }}
                onAlert={(symbol, price) => {
                  setPrefill({ symbol, price });
                  setTab("alerts");
                }}
              />
            )}
            <NewsFeed compact />
          </div>
        </TabsContent>
        <TabsContent value="portfolio"><Portfolio /></TabsContent>
        <TabsContent value="alerts">
          <Alerts alerts={alerts.data?.alerts ?? []} onChange={(a) => alerts.mutate({ alerts: a })} prefill={prefill} />
        </TabsContent>
        <TabsContent value="news"><NewsFeed /></TabsContent>
        <TabsContent value="insights"><Insights /></TabsContent>
      </Tabs>
    </div>
  );
}
