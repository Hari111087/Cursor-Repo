/** Central place for feature flags derived from the environment (server only). */
export const env = {
  demo: process.env.DEMO_MODE === "true" || !process.env.DATABASE_URL,
  hasDb: Boolean(process.env.DATABASE_URL),
  hasGoogle: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
  hasAI: Boolean(process.env.ANTHROPIC_API_KEY),
  hasFinnhub: Boolean(process.env.FINNHUB_API_KEY),
  hasPolygon: Boolean(process.env.POLYGON_API_KEY),
  hasAlphaVantage: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
  hasPush: Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY),
  timezone: process.env.APP_TIMEZONE || "UTC",
  allowedEmail: process.env.ALLOWED_EMAIL?.toLowerCase(),
  /** Approximate FX for a unified USD view of a mixed US/India portfolio. */
  usdInr: Number(process.env.USD_INR ?? 83),
};
