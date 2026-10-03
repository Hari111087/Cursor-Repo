# Hari's Assistant ⚡

A personal, Jarvis-style AI assistant for one user, Hari. It's an installable PWA (phone + desktop) that brings **time**, **email** and **markets** together in one futuristic HUD, with Anthropic Claude powering the AI features.

> Runs fully on mock data out of the box (`DEMO_MODE=true`), so you can explore the whole UI before connecting any accounts.

## Features

| Module | What it does |
| --- | --- |
| **Command Center** | Animated arc-reactor orb (breathes / listens / thinks), time-of-day greeting, live cards for today's schedule, important unread email, market snapshot and top-3 priorities. ⌘K command bar + voice input (Web Speech API) with spoken replies. AI **Daily Briefing** generated each morning. |
| **Time** | Google Calendar sync (read + create events). Tasks with priority, due date, tags and estimate; drag-and-drop between Today / This Week / Later. **AI auto-scheduling** suggests focus blocks in free gaps (nothing is booked until you accept). Pomodoro timer with session stats, smart nudges, weekly productivity chart. |
| **Email** | Gmail API, polled every 2 min. AI classifies mail as Urgent / Important / FYI / Promo and sends push notifications. One-tap thread summary. AI **Draft reply** and **Compose** with tone (formal / friendly / brief). **Every draft goes to an approval queue; nothing is ever auto-sent.** |
| **Markets** | Live watchlist (Finnhub websocket → server-sent events; Polygon / Alpha Vantage fallback) for US and Indian (NSE `.NS` / BSE `.BO`) symbols. Price and %-change alerts via push. Portfolio tracker with P&L and allocation donut. News feed with AI sentiment tags. **AI Investment Insights** from a risk questionnaire, always shown with *"Informational only, not financial advice. Consult a registered advisor."* No trades are ever placed. |
| **Settings** | Connected accounts, push notification prefs, quiet hours, briefing time, risk profile, voice on/off, dark/light theme. |

## Tech stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS + shadcn/ui-style components (Radix) · Framer Motion · Recharts · PostgreSQL + Prisma · NextAuth (Google OAuth) · Anthropic Claude (`@anthropic-ai/sdk`) · Web Push (VAPID) · Vercel Cron or a `node-cron` worker.

## Quick start (demo mode, no keys needed)

Install [Node.js 20+](https://nodejs.org), then:

- **Windows:** double-click `setup.bat`
- **macOS / Linux:** run `./setup.sh`

The script checks Node, creates `.env.local` with fresh random secrets, installs dependencies and starts the app at http://localhost:3000. Or do it manually:

```bash
npm install
cp .env.example .env.local     # DEMO_MODE=true is the default
npm run dev                    # http://localhost:3000
```

### Installing it as an app (PWA)
Once it's running (or deployed, see below):
- **Desktop Chrome / Edge:** click the install icon in the address bar → *Install*.
- **Android (Chrome):** menu ⋮ → *Install app*.
- **iPhone (Safari):** Share → *Add to Home Screen*.

Phones need the app served over HTTPS, so install on mobile from your Vercel URL rather than `localhost`.

## Full setup

### 1. Requirements
- Node.js 20+ (22 recommended)
- PostgreSQL 14+ (local, [Supabase](https://supabase.com), [Neon](https://neon.tech), etc.)

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the values. **Never commit real values**: `.env*` files are git-ignored.

| Variable | Required | Where to get it |
| --- | --- | --- |
| `DEMO_MODE` | – | `true` = mock data, no auth. Set `false` for real use. |
| `DATABASE_URL` | ✅ | Your Postgres connection string |
| `NEXTAUTH_URL` / `NEXTAUTH_SECRET` | ✅ | App URL; `openssl rand -base64 32` |
| `ALLOWED_EMAIL` | ✅ | Hari's Google address. Only this account can sign in. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✅ | Google Cloud Console (see below) |
| `ENCRYPTION_KEY` | ✅ | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `ANTHROPIC_API_KEY` | ✅ for AI | [console.anthropic.com](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | – | Defaults to `claude-opus-5-5` |
| `FINNHUB_API_KEY` | recommended | [finnhub.io](https://finnhub.io) (real-time US quotes, news, websocket) |
| `POLYGON_API_KEY` | – | [polygon.io](https://polygon.io) (fallback) |
| `ALPHA_VANTAGE_API_KEY` | – | [alphavantage.co](https://www.alphavantage.co) (fallback, Indian `.BSE` quotes) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | for push | `npm run vapid` |
| `CRON_SECRET` | ✅ | Any long random string; protects `/api/cron/*` |
| `APP_TIMEZONE` | – | IANA zone, e.g. `Asia/Kolkata` |
| `USD_INR` | – | FX rate for the unified portfolio total (default 83) |
| `NEXT_PUBLIC_OWNER_NAME` | – | Name used in greetings (default `Hari`) |

### 3. Google OAuth (Gmail + Calendar)
1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API** and **Google Calendar API**.
2. Under **OAuth consent screen**, choose *External*, add yourself as a test user, and add these scopes (least privilege):
   - `gmail.readonly`: read and classify mail
   - `gmail.send`: send **only** after you approve a draft
   - `calendar.events`: read and create events
3. Create **OAuth client ID → Web application** with redirect URI `http://localhost:3000/api/auth/callback/google` (plus your production URL).
4. Put the client ID and secret in `.env.local`.

### 4. Database
```bash
npm run db:deploy      # applies prisma/migrations (or `npm run db:push` while prototyping)
```

### 5. Run
```bash
npm run dev            # app
npm run worker         # optional: background jobs locally (email polling, alerts, briefing, nudges)
```
Sign in with Google, then open **Settings → Notifications → Enable on this device** to receive push alerts. On iPhone, add the app to the Home Screen first (iOS 16.4+), since push only works for installed PWAs.

## Deploying to Vercel
1. Push this repo to GitHub and import it in Vercel.
2. Add every variable from the table above in **Project → Settings → Environment Variables** (`DEMO_MODE=false`, `NEXTAUTH_URL=https://your-app.vercel.app`).
3. Add `https://your-app.vercel.app/api/auth/callback/google` as an authorized redirect URI in Google Cloud.
4. The build runs `prisma generate`. Run migrations against production once: `DATABASE_URL=... npx prisma migrate deploy`.
5. **Background jobs:** `vercel.json` ships with one daily cron (the morning briefing at 02:15 UTC = 07:45 IST) so it deploys on the **free Hobby plan**, which only allows daily crons. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. For 2-minute email polling and price alerts, either:
   - upgrade to Vercel Pro and add `{ "path": "/api/cron/poll-email", "schedule": "*/2 * * * *" }` and `{ "path": "/api/cron/check-alerts", "schedule": "*/5 * * * *" }` to `vercel.json`, or
   - run `npm run worker` on a small always-on host (Railway, Fly.io, a VPS), or point any external scheduler (e.g. cron-job.org) at `https://your-app/api/cron/poll-email` with the bearer header.

## Architecture

```
src/
  app/
    (app)/            Command Center, /time, /email, /markets, /settings
    api/              Route handlers (auth, rate limiting and Zod validation via lib/api.ts)
    login/ offline/   Public pages
    manifest.ts, icons/[size]   PWA manifest + generated icons
  components/         HUD (orb, background, count-up), shell, command bar, module UIs, ui/ primitives
  lib/
    ai.ts             Claude wrapper (structured outputs, refusal fallbacks, untrusted-content tagging)
    repo.ts           Data layer: Prisma, or in-memory store in demo mode
    gmail.ts calendar.ts market.ts push.ts jobs.ts assistant.ts
    crypto.ts         AES-256-GCM token encryption
    sanitize.ts       Email HTML sanitizer
public/sw.js          Service worker (offline shell + push)
scripts/worker.ts     node-cron job runner
prisma/               Schema + migrations
```

## Security & safety
- **OAuth tokens encrypted at rest** with AES-256-GCM (`ENCRYPTION_KEY`). They are never put in the session JWT or sent to the browser.
- **Single user:** sign-in is restricted to `ALLOWED_EMAIL`, and middleware gates every page and API.
- **Least-privilege Google scopes** (see above).
- **Never auto-sends email.** The only send path (`POST /api/email/drafts/:id/send`) requires a pending draft, an explicit `approved: true` from the UI's confirmation step, and a checksum of exactly what Hari reviewed. If the draft changed, the send is rejected.
- **Never trades.** There is no brokerage integration; insights are educational and always carry the disclaimer.
- **Email rendering:** HTML is sanitized server-side (`sanitize-html` allow-list) *and* rendered in a sandboxed iframe with a restrictive CSP (no scripts).
- **Prompt-injection hardening:** email and news content is wrapped in `<untrusted>` tags, and the system prompt tells Claude to treat it strictly as data. The command bar can only create tasks/events or navigate.
- **Rate limiting** on every API route (stricter on AI routes). The limiter is in-memory; swap in Upstash/Redis if you run multiple instances.
- Security headers (`X-Frame-Options: DENY`, `nosniff`, etc.), cron endpoints protected by `CRON_SECRET`, and market API keys stay server-side (live prices are relayed over SSE).

## Scripts
| Command | |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | Checks |
| `npm run db:deploy` / `db:migrate` / `db:push` | Prisma |
| `npm run worker` | Background jobs |
| `npm run vapid` | Generate Web Push keys |

## Delivery phases & verification status
1. Project setup, design system, layout, Command Center with mock data. *Verified in the browser (dark, light, mobile).*
2. Google auth + Calendar + Tasks. *Tasks verified against Postgres; auth gating verified. Live Google OAuth needs your credentials.*
3. Gmail integration, notifications, AI drafting. *Approval gate verified end to end in demo mode. Live Gmail/push need your credentials.*
4. Market data, alerts, portfolio, AI insights. *Live SSE stream, alert job and portfolio verified with mock prices. Real feeds need API keys.*
5. Voice, daily briefing, PWA, polish. *Manifest, icons, service worker and production build verified.*

AI features fall back gracefully without `ANTHROPIC_API_KEY` (heuristic classification, template drafts and plans) so every flow stays usable.
