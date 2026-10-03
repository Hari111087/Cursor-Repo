export type Priority = "P1" | "P2" | "P3" | "P4";
export type Bucket = "TODAY" | "WEEK" | "LATER" | "DONE";
export type EmailCategory = "URGENT" | "IMPORTANT" | "FYI" | "PROMO";
export type Tone = "formal" | "friendly" | "brief";

export interface Task {
  id: string;
  title: string;
  notes?: string | null;
  priority: Priority;
  bucket: Bucket;
  tags: string[];
  dueAt?: string | null;
  estimateMin: number;
  completedAt?: string | null;
  order: number;
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  location?: string | null;
  meetLink?: string | null;
  allDay?: boolean;
}

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  category: EmailCategory;
  reason?: string | null;
  isUnread: boolean;
}

export interface EmailDetail extends EmailSummary {
  to: string;
  html: string; // sanitized
  text: string;
  messageIdHeader?: string | null;
}

export interface EmailDraft {
  id: string;
  to: string;
  cc?: string | null;
  subject: string;
  body: string;
  tone: Tone;
  inReplyTo?: string | null;
  threadId?: string | null;
  status: "PENDING" | "SENT" | "DISCARDED";
  createdAt: string;
  sentAt?: string | null;
}

export interface Quote {
  symbol: string;
  name?: string;
  market: "US" | "IN";
  price: number;
  change: number;
  changePct: number;
  currency: string;
  updatedAt: string;
  spark?: number[];
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: string;
  symbols?: string[];
  sentiment?: "bullish" | "bearish" | "neutral";
}

export interface PriceAlert {
  id: string;
  symbol: string;
  kind: "ABOVE" | "BELOW" | "PCT_UP" | "PCT_DOWN";
  threshold: number;
  active: boolean;
  triggeredAt?: string | null;
  createdAt: string;
}

export interface Holding {
  id: string;
  symbol: string;
  name?: string | null;
  quantity: number;
  avgCost: number;
  currency: string;
  sector?: string | null;
}

export interface WatchItem {
  id: string;
  symbol: string;
  name?: string | null;
  market: "US" | "IN";
}

export interface FocusSession {
  id: string;
  taskId?: string | null;
  kind: "focus" | "break";
  minutes: number;
  startedAt: string;
  endedAt: string;
}

export interface Settings {
  theme: "dark" | "light" | "system";
  voiceEnabled: boolean;
  notifyEmail: boolean;
  notifyEmailLevel: "urgent" | "important" | "all";
  notifyMarkets: boolean;
  notifyNudges: boolean;
  notifyBriefing: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  briefingTime: string;
}

export interface RiskProfile {
  profile: "conservative" | "moderate" | "aggressive";
  answers: Record<string, string>;
  goals: string;
  horizonYears: number;
}

export interface Briefing {
  date: string;
  headline: string;
  sections: { title: string; points: string[] }[];
  priorities: string[];
  generatedAt: string;
  source: "ai" | "basic" | "mock";
}

export interface InsightPlan {
  summary: string;
  allocation: { bucket: string; percent: number; rationale: string }[];
  ideas: { title: string; detail: string; risk: string }[];
  rebalancing: string[];
  riskNotes: string[];
  generatedAt: string;
}

export interface FocusSuggestion {
  taskId?: string;
  title: string;
  start: string;
  end: string;
  reason: string;
}
