@echo off
REM Hari's Assistant - one-step setup for Windows. Double-click or run: setup.bat
cd /d "%~dp0"
echo Setting up Hari's Assistant...

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node 20+ from https://nodejs.org and run this again.
  pause
  exit /b 1
)
for /f %%v in ('node -p "process.versions.node.split('.')[0]"') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 20 (
  echo Node.js %NODE_MAJOR% found; version 20 or newer is required.
  pause
  exit /b 1
)

if not exist .env.local (
  copy .env.example .env.local >nul
  node -e "const fs=require('fs'),c=require('crypto');let s=fs.readFileSync('.env.local','utf8');s=s.replace(/^NEXTAUTH_SECRET=.*$/m,'NEXTAUTH_SECRET='+c.randomBytes(32).toString('base64')).replace(/^ENCRYPTION_KEY=.*$/m,'ENCRYPTION_KEY='+c.randomBytes(32).toString('base64')).replace(/^CRON_SECRET=.*$/m,'CRON_SECRET='+c.randomBytes(24).toString('hex'));fs.writeFileSync('.env.local',s)"
  echo Created .env.local ^(demo mode, with fresh random secrets^)
)

echo Installing dependencies ^(a few minutes the first time^)...
call npm install --no-audit --no-fund || (pause & exit /b 1)

findstr /b "DEMO_MODE=false" .env.local >nul && call npx prisma migrate deploy

echo.
echo Done! Opening http://localhost:3000  (close this window to stop)
start "" http://localhost:3000
call npm run dev
