import type {
  Briefing, CalendarEvent, EmailDetail, FocusSession, Holding, NewsItem, PriceAlert, Quote, Task, WatchItem,
} from "./types";
import { zonedAt } from "./time";

/** Deterministic mock data for DEMO_MODE and as a graceful fallback when an API is not configured. */

function at(hoursFromMidnight: number, dayOffset = 0) {
  return zonedAt(hoursFromMidnight * 60, dayOffset).toISOString();
}
const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

export function mockEvents(): CalendarEvent[] {
  return [
    { id: "ev1", title: "Daily stand-up", start: at(9.5), end: at(9.75), meetLink: "https://meet.google.com/" },
    { id: "ev2", title: "Design review: Q4 roadmap", start: at(11), end: at(12), location: "Room Orion" },
    { id: "ev3", title: "Lunch with Priya", start: at(13), end: at(14), location: "Cafe Nebula" },
    { id: "ev4", title: "Investor sync", start: at(15), end: at(15.5), meetLink: "https://meet.google.com/" },
    { id: "ev5", title: "Gym", start: at(18.5), end: at(19.5) },
    { id: "ev6", title: "Product planning", start: at(10, 1), end: at(11, 1) },
  ];
}

export function mockTasks(): Task[] {
  const base = { notes: null, completedAt: null, createdAt: ago(3000) };
  return [
    { ...base, id: "t1", title: "Finish Q4 strategy report", priority: "P1", bucket: "TODAY", tags: ["work", "deep"], dueAt: at(17), estimateMin: 120, order: 0 },
    { ...base, id: "t2", title: "Reply to Ananya about contract", priority: "P1", bucket: "TODAY", tags: ["email"], dueAt: at(12), estimateMin: 15, order: 1 },
    { ...base, id: "t3", title: "Review portfolio rebalancing", priority: "P2", bucket: "TODAY", tags: ["finance"], dueAt: null, estimateMin: 45, order: 2 },
    { ...base, id: "t4", title: "Prepare slides for Friday demo", priority: "P2", bucket: "WEEK", tags: ["work"], dueAt: at(16, 2), estimateMin: 90, order: 0 },
    { ...base, id: "t5", title: "Book flights to Bengaluru", priority: "P3", bucket: "WEEK", tags: ["personal", "travel"], dueAt: null, estimateMin: 20, order: 1 },
    { ...base, id: "t6", title: "Read 'The Psychology of Money'", priority: "P4", bucket: "LATER", tags: ["learning"], dueAt: null, estimateMin: 60, order: 0 },
    { ...base, id: "t7", title: "Set up home server backups", priority: "P3", bucket: "LATER", tags: ["personal", "tech"], dueAt: null, estimateMin: 90, order: 1 },
    ...[1, 1, 2, 3, 3, 3, 4, 5, 5, 6].map((d, i) => ({
      ...base, id: `d${i}`, title: ["Ship onboarding copy", "Expense report", "1:1 prep", "Fix login bug", "Investor memo", "Update OKRs", "Pay credit card", "Review PR #42", "Plan sprint", "Call bank"][i],
      priority: "P3" as const, bucket: "DONE" as const, tags: [], dueAt: null, estimateMin: 30, order: i, completedAt: zonedAt(14 * 60, -d).toISOString(),
    })),
  ];
}

const emailBodies: Record<string, string> = {
  m1: `<p>Hi Hari,</p><p>The client moved the contract deadline up to <b>tomorrow 10 AM</b>. We need your sign-off on the revised payment terms (section 4.2) and the updated SLA before then.</p><p>Can you review tonight? The redlined draft is in the shared folder.</p><p>Thanks,<br/>Ananya</p>`,
  m2: `<p>Hello Hari,</p><p>Following up on last week's design review. I've attached the updated Q4 roadmap with three options for the mobile launch timeline. Option B looks most realistic given the hiring plan.</p><p>Would love your thoughts before Thursday's planning session.</p><p>Best,<br/>Rahul</p>`,
  m3: `<p>Your weekly digest: 12 new articles in AI, 4 in Markets. Top story: "Why index funds keep winning".</p>`,
  m4: `<p><b>Flash sale!</b> 40% off premium headphones this weekend only.</p>`,
  m5: `<p>Hi Hari, the AWS invoice for September is $412.80, which is 18% higher than August. Most of the increase is from data transfer.</p>`,
  m6: `<p>Hey! Are we still on for lunch at 1? I booked a table at Cafe Nebula. — Priya</p>`,
};

export function mockEmails(): EmailDetail[] {
  const list: Omit<EmailDetail, "html" | "text">[] = [
    { id: "m1", threadId: "th1", from: "Ananya Rao <ananya@acme.co>", to: "hari@example.com", subject: "URGENT: Contract deadline moved to tomorrow", snippet: "The client moved the contract deadline up to tomorrow 10 AM…", receivedAt: ago(12), category: "URGENT", reason: "Deadline within 24h and needs your sign-off", isUnread: true },
    { id: "m2", threadId: "th2", from: "Rahul Mehta <rahul@acme.co>", to: "hari@example.com", subject: "Updated Q4 roadmap: 3 options", snippet: "Following up on last week's design review…", receivedAt: ago(55), category: "IMPORTANT", reason: "Decision needed before Thursday", isUnread: true },
    { id: "m5", threadId: "th5", from: "AWS Billing <billing@aws.amazon.com>", to: "hari@example.com", subject: "Your September invoice is available", snippet: "The AWS invoice for September is $412.80…", receivedAt: ago(140), category: "IMPORTANT", reason: "Cost spike worth reviewing", isUnread: true },
    { id: "m6", threadId: "th6", from: "Priya S <priya@gmail.com>", to: "hari@example.com", subject: "Lunch today?", snippet: "Are we still on for lunch at 1?", receivedAt: ago(200), category: "FYI", reason: "Confirms existing calendar event", isUnread: false },
    { id: "m3", threadId: "th3", from: "Medium Digest <noreply@medium.com>", to: "hari@example.com", subject: "Your weekly digest", snippet: "12 new articles in AI, 4 in Markets…", receivedAt: ago(400), category: "FYI", reason: "Newsletter", isUnread: true },
    { id: "m4", threadId: "th4", from: "SoundWave Store <deals@soundwave.shop>", to: "hari@example.com", subject: "Flash sale: 40% off", snippet: "40% off premium headphones this weekend only", receivedAt: ago(600), category: "PROMO", reason: "Marketing", isUnread: true },
  ];
  return list.map((e) => ({ ...e, html: emailBodies[e.id], text: emailBodies[e.id].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), messageIdHeader: `<${e.id}@mock>` }));
}

function spark(seed: number, end: number, n = 32) {
  // Seeded random walk (built backwards from the current price) so charts look organic and stay stable
  let x = seed * 2654435761 % 4294967296;
  const rand = () => ((x = (1664525 * x + 1013904223) % 4294967296) / 4294967296) - 0.5;
  const out: number[] = [];
  let v = end;
  for (let i = 0; i < n; i++) {
    out.push(Number(v.toFixed(2)));
    v = v / (1 + rand() * 0.012);
  }
  return out.reverse();
}

const QUOTE_SEED: Omit<Quote, "updatedAt" | "spark">[] = [
  { symbol: "AAPL", name: "Apple", market: "US", price: 236.48, change: 2.91, changePct: 1.25, currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA", market: "US", price: 182.3, change: -3.12, changePct: -1.68, currency: "USD" },
  { symbol: "MSFT", name: "Microsoft", market: "US", price: 512.9, change: 4.05, changePct: 0.8, currency: "USD" },
  { symbol: "SPY", name: "S&P 500 ETF", market: "US", price: 668.12, change: 1.84, changePct: 0.28, currency: "USD" },
  { symbol: "RELIANCE.NS", name: "Reliance Industries", market: "IN", price: 1387.4, change: 12.6, changePct: 0.92, currency: "INR" },
  { symbol: "TCS.NS", name: "Tata Consultancy", market: "IN", price: 3052.15, change: -21.4, changePct: -0.7, currency: "INR" },
  { symbol: "INFY.NS", name: "Infosys", market: "IN", price: 1468.9, change: 9.75, changePct: 0.67, currency: "INR" },
  { symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", market: "IN", price: 287.62, change: 1.1, changePct: 0.38, currency: "INR" },
];

export function mockQuote(symbol: string): Quote {
  const s = QUOTE_SEED.find((q) => q.symbol === symbol.toUpperCase());
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = s ?? {
    symbol: symbol.toUpperCase(),
    name: symbol.toUpperCase(),
    market: /\.(NS|BO|BSE|NSE)$/i.test(symbol) ? ("IN" as const) : ("US" as const),
    price: 50 + (seed % 400),
    change: ((seed % 9) - 4) * 0.7,
    changePct: ((seed % 9) - 4) * 0.35,
    currency: /\.(NS|BO|BSE|NSE)$/i.test(symbol) ? "INR" : "USD",
  };
  return { ...base, updatedAt: new Date().toISOString(), spark: spark(seed, base.price) };
}

export function mockWatchlist(): WatchItem[] {
  return QUOTE_SEED.map((q, i) => ({ id: `w${i}`, symbol: q.symbol, name: q.name, market: q.market }));
}

export function mockHoldings(): Holding[] {
  return [
    { id: "h1", symbol: "AAPL", name: "Apple", quantity: 25, avgCost: 182.4, currency: "USD", sector: "Technology" },
    { id: "h2", symbol: "MSFT", name: "Microsoft", quantity: 12, avgCost: 401.2, currency: "USD", sector: "Technology" },
    { id: "h3", symbol: "SPY", name: "S&P 500 ETF", quantity: 18, avgCost: 540.0, currency: "USD", sector: "Index" },
    { id: "h4", symbol: "NVDA", name: "NVIDIA", quantity: 30, avgCost: 128.5, currency: "USD", sector: "Semiconductors" },
    { id: "h5", symbol: "RELIANCE.NS", name: "Reliance Industries", quantity: 40, avgCost: 1250, currency: "INR", sector: "Energy" },
    { id: "h6", symbol: "NIFTYBEES.NS", name: "Nifty 50 ETF", quantity: 300, avgCost: 245, currency: "INR", sector: "Index" },
  ];
}

export function mockAlerts(): PriceAlert[] {
  return [
    { id: "a1", symbol: "NVDA", kind: "BELOW", threshold: 175, active: true, createdAt: ago(5000) },
    { id: "a2", symbol: "AAPL", kind: "ABOVE", threshold: 245, active: true, createdAt: ago(8000) },
    { id: "a3", symbol: "RELIANCE.NS", kind: "PCT_UP", threshold: 2, active: true, createdAt: ago(9000) },
  ];
}

export function mockNews(): NewsItem[] {
  return [
    { id: "n1", headline: "Fed signals patience as inflation cools toward target", summary: "Policymakers indicated they are in no rush to cut rates further, citing resilient labor data.", source: "Reuters", url: "https://www.reuters.com", datetime: ago(35), symbols: ["SPY"], sentiment: "neutral" },
    { id: "n2", headline: "NVIDIA faces export headwinds as new chip rules take effect", summary: "Analysts trimmed near-term estimates after fresh restrictions on advanced accelerators.", source: "Bloomberg", url: "https://www.bloomberg.com", datetime: ago(80), symbols: ["NVDA"], sentiment: "bearish" },
    { id: "n3", headline: "Apple's services revenue hits record on strong App Store growth", summary: "Services now account for over a quarter of revenue, boosting margins.", source: "CNBC", url: "https://www.cnbc.com", datetime: ago(150), symbols: ["AAPL"], sentiment: "bullish" },
    { id: "n4", headline: "Nifty ends higher led by energy and IT; Reliance gains 1%", summary: "Domestic institutional buying offset FII outflows for a fourth straight session.", source: "Economic Times", url: "https://economictimes.indiatimes.com", datetime: ago(260), symbols: ["RELIANCE.NS", "NIFTYBEES.NS"], sentiment: "bullish" },
    { id: "n5", headline: "SIP inflows touch new monthly high in India", summary: "Retail investors continue to favour systematic investment plans despite volatility.", source: "Mint", url: "https://www.livemint.com", datetime: ago(420), symbols: [], sentiment: "bullish" },
  ];
}

export function mockFocusSessions(): FocusSession[] {
  const out: FocusSession[] = [];
  const pattern = [3, 5, 4, 6, 2, 1, 4];
  for (let d = 6; d >= 0; d--) {
    for (let i = 0; i < pattern[6 - d]; i++) {
      const start = zonedAt((9 + i * 1.5) * 60, -d);
      out.push({ id: `f${d}-${i}`, kind: "focus", minutes: 25, startedAt: start.toISOString(), endedAt: new Date(start.getTime() + 25 * 60_000).toISOString() });
    }
  }
  return out;
}

export function mockBriefing(date: string): Briefing {
  return {
    date,
    headline: "A focused day: one urgent contract, a design decision, and markets drifting higher.",
    sections: [
      { title: "Calendar", points: ["Stand-up at 9:30, design review at 11:00, investor sync at 3:00 PM.", "You have a 2-hour free block from 4:00 to 6:00 PM. Ideal for the Q4 report."] },
      { title: "Email", points: ["Ananya needs contract sign-off before 10 AM tomorrow (urgent).", "Rahul shared 3 roadmap options; he recommends option B.", "AWS bill up 18% month over month, mostly from data transfer."] },
      { title: "Markets", points: ["S&P 500 ETF +0.28%, Nifty ETF +0.38%.", "NVDA −1.7% on export-rule headlines; your alert at $175 is close.", "Portfolio is up ~0.6% today."] },
    ],
    priorities: ["Sign off on the Ananya contract", "Draft the Q4 strategy report (2h focus block)", "Pick a roadmap option before Thursday"],
    generatedAt: new Date().toISOString(),
    source: "mock",
  };
}
