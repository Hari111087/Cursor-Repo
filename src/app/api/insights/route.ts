import { z } from "zod";
import { aiErrorResponse, aiJson } from "@/lib/ai";
import { env } from "@/lib/env";
import { route } from "@/lib/api";
import { getQuotes } from "@/lib/market";
import { getLatestInsight, getRiskProfile, listHoldings, saveInsight, saveRiskProfile } from "@/lib/repo";
import type { InsightPlan } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const DISCLAIMER = "Informational only, not financial advice. Consult a registered advisor.";

export const GET = route(async ({ userId }) => {
  const [risk, insight] = await Promise.all([getRiskProfile(userId), getLatestInsight(userId)]);
  return Response.json({ risk, insight, disclaimer: DISCLAIMER });
});

const Body = z.object({
  profile: z.enum(["conservative", "moderate", "aggressive"]),
  answers: z.record(z.string(), z.string().max(200)),
  goals: z.string().min(3).max(1000),
  horizonYears: z.number().int().min(1).max(50),
});

const PlanSchema = z.object({
  summary: z.string(),
  allocation: z.array(z.object({ bucket: z.string(), percent: z.number(), rationale: z.string() })).describe("Percents sum to 100"),
  ideas: z.array(z.object({ title: z.string(), detail: z.string(), risk: z.string() })).describe("3-6 diversified plan ideas e.g. SIP into index funds, debt funds, international ETFs"),
  rebalancing: z.array(z.string()).describe("Rebalancing suggestions versus current holdings"),
  riskNotes: z.array(z.string()),
});

/** Saves the questionnaire and generates diversified, educational plan ideas. Never places trades. */
export const POST = route(
  async ({ req, userId }) => {
    const risk = Body.parse(await req.json());
    await saveRiskProfile(userId, risk);
    if (!env.hasAI) {
      const insight = { ...TEMPLATES[risk.profile], generatedAt: new Date().toISOString(), template: true };
      await saveInsight(userId, insight);
      return Response.json({ risk, insight, disclaimer: DISCLAIMER });
    }
    try {
      const holdings = await listHoldings(userId);
      const quotes = await getQuotes(holdings.map((h) => h.symbol));
      const holdingsText = holdings
        .map((h) => {
          const q = quotes.find((x) => x.symbol === h.symbol);
          return `${h.symbol} (${h.sector ?? "n/a"}): ${h.quantity} @ ${h.avgCost} ${h.currency}, now ${q?.price.toFixed(2) ?? "?"}`;
        })
        .join("\n");
      const plan = await aiJson(PlanSchema, {
        system: `You are an educational investment-planning assistant for an individual investing in the US and India.
Give general, diversified, low-cost ideas (index funds/ETFs, SIPs, debt allocation, emergency fund, rebalancing bands).
Never recommend timing the market, leverage, or a single stock as a core holding. Never claim certainty about returns.
Explain reasoning and risks plainly. This is informational only, not financial advice.`,
        prompt: `Risk profile: ${risk.profile}\nTime horizon: ${risk.horizonYears} years\nGoals: ${risk.goals}\nQuestionnaire: ${JSON.stringify(risk.answers)}\n\nCurrent holdings:\n${holdingsText || "none"}`,
        effort: "high",
        maxTokens: 16000,
      });
      const insight: InsightPlan = { ...plan, generatedAt: new Date().toISOString() };
      await saveInsight(userId, insight);
      return Response.json({ risk, insight, disclaimer: DISCLAIMER });
    } catch (err) {
      return aiErrorResponse(err);
    }
  },
  { limit: 5 },
);

/** Generic, educational templates used only when no AI key is configured. */
const TEMPLATES: Record<z.infer<typeof Body>["profile"], Omit<InsightPlan, "generatedAt">> = {
  conservative: {
    summary: "Capital preservation first: a large high-quality debt core, a modest diversified equity sleeve via index funds, and a solid emergency buffer.",
    allocation: [
      { bucket: "Debt funds / bonds", percent: 50, rationale: "Stability and predictable income." },
      { bucket: "Large-cap index funds", percent: 25, rationale: "Low-cost equity growth (Nifty 50 / S&P 500)." },
      { bucket: "Liquid fund / cash", percent: 15, rationale: "Emergency fund and near-term goals." },
      { bucket: "Gold", percent: 10, rationale: "Diversifier during equity drawdowns." },
    ],
    ideas: [
      { title: "Monthly SIP into a Nifty 50 index fund", detail: "Automate a small, fixed SIP to build equity exposure gradually.", risk: "Equity values can fall significantly in the short term." },
      { title: "Short-duration debt fund ladder", detail: "Spread debt across maturities to manage interest-rate risk.", risk: "Credit and rate risk; returns are not guaranteed." },
      { title: "6-month emergency fund", detail: "Keep it in a liquid fund or high-yield savings before investing more.", risk: "Inflation can erode cash value over time." },
    ],
    rebalancing: ["Review allocation every 6 months.", "Rebalance when any bucket drifts more than 5 percentage points."],
    riskNotes: ["Lower expected returns than equity-heavy portfolios.", "Inflation risk on cash and debt holdings."],
  },
  moderate: {
    summary: "Balanced growth: a diversified equity core across India and the US via index funds, with a debt cushion to dampen volatility.",
    allocation: [
      { bucket: "India equity index (Nifty 50/Next 50)", percent: 35, rationale: "Home-market growth at low cost." },
      { bucket: "US/international equity index", percent: 25, rationale: "Geographic and currency diversification." },
      { bucket: "Debt funds / bonds", percent: 30, rationale: "Reduces drawdowns and funds rebalancing." },
      { bucket: "Gold", percent: 10, rationale: "Low correlation with equities." },
    ],
    ideas: [
      { title: "Split SIP: India + global index funds", detail: "Automate monthly SIPs into a Nifty 50 fund and an S&P 500 / total-world feeder.", risk: "Equity and currency fluctuations." },
      { title: "Reduce single-stock concentration", detail: "Cap any single stock at ~5–10% of the portfolio.", risk: "Concentrated positions amplify losses." },
      { title: "Goal-based buckets", detail: "Keep the home down-payment money in debt funds as the purchase date approaches.", risk: "Equity exposure close to a goal date can force selling at a loss." },
    ],
    rebalancing: ["Annual rebalance back to targets.", "Use new SIP money to top up underweight buckets before selling anything."],
    riskNotes: ["Expect equity drawdowns of 20–30% in bad years.", "Past index returns do not guarantee future results."],
  },
  aggressive: {
    summary: "Long-horizon growth: equity-heavy and globally diversified, with small satellite positions and a minimal debt buffer.",
    allocation: [
      { bucket: "India equity index (incl. mid-cap)", percent: 40, rationale: "Higher growth potential over long horizons." },
      { bucket: "US/international equity index", percent: 35, rationale: "Global diversification and tech exposure." },
      { bucket: "Sector/thematic satellites", percent: 10, rationale: "Limited, deliberate tilts." },
      { bucket: "Debt / liquid", percent: 15, rationale: "Dry powder and emergency cushion." },
    ],
    ideas: [
      { title: "Step-up SIP", detail: "Increase SIP amounts 10% each year with income growth.", risk: "Higher volatility; requires staying invested through crashes." },
      { title: "Keep satellites small", detail: "Limit thematic or single-stock bets to ~10% in total.", risk: "Thematic funds can underperform for years." },
      { title: "Tax-efficient harvesting", detail: "Book long-term gains within annual exemption limits where applicable.", risk: "Tax rules change; consult a tax professional." },
    ],
    rebalancing: ["Rebalance annually or at 10-point drift.", "Shift gradually toward debt as major goals approach."],
    riskNotes: ["Drawdowns of 30–50% are possible.", "Only suitable if you won't need this money for many years."],
  },
};
