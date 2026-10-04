"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Command as CmdIcon, Mic, Moon, Settings, Sun, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAssistant } from "./assistant-provider";
import { CommandBar } from "./command-bar";
import { HudBackground } from "./hud/background";
import { NAV } from "./nav-items";

function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = !mounted || resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className={cn("flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground", className)}
      aria-label={`Switch to ${dark ? "light" : "dark"} theme`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function AppShell({ children, demo }: { children: React.ReactNode; demo: boolean }) {
  const path = usePathname();
  const { setCommandOpen, listen, state } = useAssistant();

  return (
    <div className="relative min-h-dvh">
      <HudBackground />

      {/* Desktop sidebar */}
      <aside className="glass fixed inset-y-0 left-0 z-40 hidden w-20 flex-col items-center gap-2 border-y-0 border-l-0 py-5 md:flex lg:w-60 lg:items-stretch lg:px-4">
        <Link href="/" className="mb-6 flex items-center gap-3 px-2" aria-label="Hari's Assistant home">
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan/50 bg-cyan/10 shadow-glow">
            <Zap className="h-5 w-5 text-cyan" />
          </span>
          <span className="hidden font-display text-sm font-bold leading-tight tracking-widest lg:block">
            <span className="text-gradient">HARI&apos;S</span>
            <br />
            <span className="text-xs text-muted-foreground">ASSISTANT</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1" aria-label="Main">
          {NAV.map((n) => {
            const active = isActive(path, n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  active ? "text-cyan" : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                )}
              >
                {active && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 rounded-md bg-cyan/10 neon-border" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
                )}
                <n.icon className={cn("relative h-5 w-5 shrink-0", active && "drop-shadow-[0_0_6px_rgb(46_230_230)]")} />
                <span className="relative hidden lg:inline">{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-1 lg:flex-row lg:justify-between">
          <button
            onClick={() => setCommandOpen(true)}
            className="hidden h-10 flex-1 items-center gap-2 rounded-md border px-3 text-xs text-muted-foreground hover:border-cyan/40 hover:text-foreground lg:flex"
          >
            <CmdIcon className="h-3.5 w-3.5" /> Command <kbd className="ml-auto rounded border px-1 text-[10px]">⌘K</kbd>
          </button>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex h-14 items-center justify-between border-x-0 border-t-0 px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-display text-sm font-bold tracking-widest">
          <Zap className="h-4 w-4 text-cyan" /> <span className="text-gradient">HARI&apos;S ASSISTANT</span>
        </Link>
        <div className="flex items-center">
          <button onClick={() => setCommandOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground" aria-label="Open command bar">
            <CmdIcon className="h-4 w-4" />
          </button>
          <Link href="/settings" className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground" aria-label="Settings">
            <Settings className="h-4 w-4" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="px-4 pb-28 pt-4 md:ml-20 md:px-8 md:pb-10 md:pt-8 lg:ml-60">
        {demo && (
          <div className="mx-auto mb-4 max-w-7xl rounded-md border border-gold/30 bg-gold/10 px-3 py-2 text-xs text-gold">
            Demo mode: showing mock data. Configure your environment (see README) to connect Google, markets and AI.
          </div>
        )}
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-stretch justify-around border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
        {NAV.slice(0, 2).map((n) => (
          <TabLink key={n.href} {...n} active={isActive(path, n.href)} />
        ))}
        <button
          onClick={listen}
          aria-label="Talk to Jarvis"
          className={cn(
            "-mt-6 flex h-16 w-16 items-center justify-center self-start rounded-full border border-cyan/60 bg-space-950 shadow-glow",
            state === "listening" && "animate-pulse border-magenta shadow-glow-magenta",
          )}
        >
          <Mic className={cn("h-6 w-6", state === "listening" ? "text-magenta" : "text-cyan")} />
        </button>
        {NAV.slice(2, 4).map((n) => (
          <TabLink key={n.href} {...n} active={isActive(path, n.href)} />
        ))}
      </nav>

      <CommandBar />
    </div>
  );
}

function TabLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; active: boolean }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("flex flex-1 flex-col items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider", active ? "text-cyan" : "text-muted-foreground")}>
      <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_rgb(46_230_230)]")} />
      {label}
    </Link>
  );
}
