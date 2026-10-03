"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { CornerDownLeft, Mic, Moon, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAssistant } from "./assistant-provider";
import { NAV } from "./nav-items";
import { Orb } from "./hud/orb";

const SUGGESTIONS = [
  "What's on my calendar today?",
  "Add a P1 task to review the contract",
  "Block 2pm to 3pm tomorrow for deep work",
  "Show me my emails",
];

export function CommandBar() {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const { commandOpen: open, setCommandOpen: setOpen, ask, state, history, listen } = useAssistant();
  const [value, setValue] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const submit = async (text: string) => {
    if (!text.trim()) return;
    setValue("");
    await ask(text.trim());
  };

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const last = history.slice(-4);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#05071a]/70 backdrop-blur-sm" />
        <DialogPrimitive.Content className="fixed left-1/2 top-[12dvh] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2" aria-describedby={undefined}>
          <DialogPrimitive.Title className="sr-only">Command bar</DialogPrimitive.Title>
          <Command className="glass neon-border overflow-hidden rounded-xl" shouldFilter={!value.includes(" ") || value.length < 3} loop>
            <div className="flex items-center gap-3 border-b px-4">
              <Orb state={state} size={34} className="[&>span:last-child]:hidden" />
              <Command.Input
                value={value}
                onValueChange={setValue}
                placeholder="Ask Jarvis anything, or jump to…"
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              <button onClick={listen} className="rounded-md p-2 text-cyan hover:bg-cyan/10" aria-label="Voice input">
                <Mic className="h-4 w-4" />
              </button>
            </div>

            {last.length > 0 && (
              <div className="max-h-48 space-y-2 overflow-y-auto border-b px-4 py-3 text-sm scrollbar-thin" aria-live="polite">
                {last.map((m, i) => (
                  <p key={i} className={m.role === "you" ? "text-muted-foreground" : "text-foreground"}>
                    <span className={m.role === "you" ? "text-violet" : "text-cyan"}>{m.role === "you" ? "You" : "Jarvis"}:</span> {m.text}
                  </p>
                ))}
                {state === "thinking" && <p className="animate-pulse text-cyan">Jarvis is thinking…</p>}
              </div>
            )}

            <Command.List className="max-h-[50dvh] overflow-y-auto p-2 scrollbar-thin">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">Type at least 3 characters to ask Jarvis</Command.Empty>
              {value.trim().length > 2 && (
                <Group heading="Ask">
                  <Item onSelect={() => submit(value)} value={`ask ${value}`}>
                    <Sparkles className="text-magenta" /> Ask Jarvis: <span className="truncate text-cyan">“{value}”</span>
                    <CornerDownLeft className="ml-auto opacity-50" />
                  </Item>
                </Group>
              )}
              <Group heading="Navigate">
                {NAV.map((n) => (
                  <Item key={n.href} onSelect={() => go(n.href)} value={`go ${n.label}`}>
                    <n.icon className="text-cyan" /> {n.label}
                  </Item>
                ))}
              </Group>
              {!value && (
                <Group heading="Try saying">
                  {SUGGESTIONS.map((s) => (
                    <Item key={s} onSelect={() => submit(s)} value={s}>
                      <Sparkles className="text-violet" /> {s}
                    </Item>
                  ))}
                </Group>
              )}
              <Group heading="Preferences">
                <Item onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} value="toggle theme">
                  {resolvedTheme === "dark" ? <Sun className="text-gold" /> : <Moon className="text-violet" />} Toggle theme
                </Item>
              </Group>
            </Command.List>
          </Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function Group({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <Command.Group heading={heading} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
      {children}
    </Command.Group>
  );
}

function Item({ children, onSelect, value }: { children: React.ReactNode; onSelect: () => void; value: string }) {
  return (
    <Command.Item
      value={value}
      onSelect={onSelect}
     
      className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-sm aria-selected:bg-cyan/10 aria-selected:text-foreground [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0"
    >
      {children}
    </Command.Item>
  );
}
