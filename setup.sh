#!/usr/bin/env bash
# Hari's Assistant — one-step setup for macOS / Linux.
# Usage:  ./setup.sh        (installs, then starts the app in demo mode)
set -euo pipefail
cd "$(dirname "$0")"

echo "⚡ Setting up Hari's Assistant…"

if ! command -v node >/dev/null 2>&1; then
  echo "✖ Node.js is not installed. Install Node 20+ from https://nodejs.org and run this again."
  exit 1
fi
NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "✖ Node.js $NODE_MAJOR found; version 20 or newer is required (https://nodejs.org)."
  exit 1
fi

if [ ! -f .env.local ]; then
  cp .env.example .env.local
  SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  CRON=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
  node -e "
    const fs=require('fs');let s=fs.readFileSync('.env.local','utf8');
    s=s.replace(/^NEXTAUTH_SECRET=.*$/m,'NEXTAUTH_SECRET=$SECRET')
       .replace(/^ENCRYPTION_KEY=.*$/m,'ENCRYPTION_KEY=$KEY')
       .replace(/^CRON_SECRET=.*$/m,'CRON_SECRET=$CRON');
    fs.writeFileSync('.env.local',s);"
  echo "✔ Created .env.local (demo mode, with fresh random secrets)"
fi

echo "📦 Installing dependencies (a few minutes the first time)…"
npm install --no-audit --no-fund

if grep -q '^DEMO_MODE=false' .env.local; then
  echo "🗄  Applying database migrations…"
  npx prisma migrate deploy
fi

echo ""
echo "✅ Done! Starting at http://localhost:3000  (Ctrl+C to stop)"
echo "   Edit .env.local to add your API keys — see README.md."
npm run dev
