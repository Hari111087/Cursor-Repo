"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, FileText, Inbox, ListChecks, Mail, PenSquare, Reply, Search, Send, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { draftChecksum } from "@/lib/checksum";
import { api, useApi } from "@/lib/client";
import { CATEGORY_BADGE } from "@/lib/ui";
import type { EmailCategory, EmailDetail, EmailDraft, EmailSummary, Tone } from "@/lib/types";
import { cn, relativeTime } from "@/lib/utils";

type Filter = "ALL" | EmailCategory | "DRAFTS";
interface Summary { tldr: string; keyPoints: string[]; actionItems: string[] }

/** Renders already-sanitized HTML inside a fully sandboxed iframe (no scripts, no same-origin). */
function SafeEmailBody({ html, text }: { html: string; text: string }) {
  const { resolvedTheme } = useTheme();
  const fg = resolvedTheme === "light" ? "#151a3a" : "#e7ecff";
  const doc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'"><base target="_blank"><style>
      body{font-family:Inter,system-ui,sans-serif;font-size:14px;line-height:1.6;color:${fg};background:transparent;margin:0;padding:4px;word-wrap:break-word}
      a{color:#00E5FF} img{max-width:100%;height:auto} table{max-width:100%} blockquote{border-left:2px solid #8B5CF6;margin:0;padding-left:12px;color:#aab}
    </style></head><body>${html || `<pre style="white-space:pre-wrap;font-family:inherit">${text.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)}</pre>`}</body></html>`,
    [html, text, fg],
  );
  const [h, setH] = useState(320);
  return (
    <iframe
      title="Email content"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
      srcDoc={doc}
      className="w-full rounded-md bg-transparent"
      style={{ height: h, colorScheme: "normal" }}
      onLoad={() => {
        // Sandboxed without same-origin, so content can't be measured; size by content length instead.
        setH(Math.min(900, Math.max(240, (html || text).length / 3)));
      }}
    />
  );
}

function EmailInner() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const selectedId = params.get("id");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const inbox = useApi<{ emails: EmailSummary[]; drafts: EmailDraft[]; source: string }>(`/api/email${search ? `?q=${encodeURIComponent(search)}` : ""}`, { refreshMs: 120_000 });
  const detail = useApi<{ email: EmailDetail }>(selectedId ? `/api/email/${selectedId}` : null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [reviewDraft, setReviewDraft] = useState<EmailDraft | null>(null);

  useEffect(() => setSummary(null), [selectedId]);

  const emails = useMemo(() => inbox.data?.emails ?? [], [inbox.data]);
  const drafts = inbox.data?.drafts ?? [];
  const visible = filter === "ALL" ? emails : emails.filter((e) => e.category === filter);
  const counts = useMemo(() => emails.reduce<Record<string, number>>((a, e) => ({ ...a, [e.category]: (a[e.category] ?? 0) + 1 }), {}), [emails]);

  const select = (id: string | null) => router.replace(id ? `/email?id=${id}` : "/email", { scroll: false });

  const summarize = async () => {
    if (!selectedId) return;
    setSummarizing(true);
    try {
      const res = await api<{ summary: Summary }>(`/api/email/${selectedId}/summary`, { method: "POST" });
      setSummary(res.summary);
    } catch (e) {
      toast({ kind: "error", title: "Summary failed", body: (e as Error).message });
    } finally {
      setSummarizing(false);
    }
  };

  const onDraftCreated = (d: EmailDraft) => {
    inbox.mutate((x) => (x ? { ...x, drafts: [d, ...x.drafts] } : x));
    setReviewDraft(d);
  };

  const email = detail.data?.email;

  return (
    <div>
      <PageHeader
        title="Email Assistant"
        subtitle={inbox.data?.source === "mock" ? "Sample inbox · connect Gmail in Settings" : "Gmail · AI-triaged · every send needs your approval"}
        actions={<Button onClick={() => setComposeOpen(true)}><PenSquare /> Compose</Button>}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)} className="mb-4 overflow-x-auto scrollbar-thin">
        <TabsList>
          <TabsTrigger value="ALL"><Inbox /> All <span className="text-xs opacity-60">{emails.length}</span></TabsTrigger>
          {(["URGENT", "IMPORTANT", "FYI", "PROMO"] as const).map((c) => (
            <TabsTrigger key={c} value={c}>{c === "FYI" ? "FYI" : c[0] + c.slice(1).toLowerCase()} <span className="text-xs opacity-60">{counts[c] ?? 0}</span></TabsTrigger>
          ))}
          <TabsTrigger value="DRAFTS"><ListChecks /> Approval queue {drafts.length > 0 && <Badge variant="magenta" className="px-1.5">{drafts.length}</Badge>}</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_1fr]">
        {/* List */}
        <div className={cn("space-y-3", selectedId && "hidden lg:block")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearch(query.trim());
            }}
            className="relative"
          >
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search Gmail (e.g. from:ananya)" className="pl-9" aria-label="Search email" />
          </form>

          <Card className="p-2">
            {filter === "DRAFTS" ? (
              drafts.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">No drafts awaiting approval.</p>
              ) : (
                <ul className="divide-y divide-foreground/5">
                  {drafts.map((d) => (
                    <li key={d.id}>
                      <button onClick={() => setReviewDraft(d)} className="w-full rounded-md p-3 text-left hover:bg-cyan/5">
                        <div className="flex items-center gap-2">
                          <Badge variant="magenta">Pending</Badge>
                          <span className="truncate text-xs text-muted-foreground">to {d.to}</span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium">{d.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">{d.body.slice(0, 100)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : inbox.loading ? (
              <div className="space-y-2 p-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-16" />)}</div>
            ) : visible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nothing here.</p>
            ) : (
              <ul className="max-h-[70dvh] divide-y divide-foreground/5 overflow-y-auto scrollbar-thin">
                {visible.map((e, i) => (
                  <motion.li key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                    <button
                      onClick={() => select(e.id)}
                      className={cn("w-full rounded-md p-3 text-left transition-colors hover:bg-cyan/5", selectedId === e.id && "bg-cyan/10 neon-border")}
                      aria-current={selectedId === e.id}
                    >
                      <div className="flex items-center gap-2">
                        {e.isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-cyan shadow-glow" aria-label="Unread" />}
                        <span className={cn("truncate text-sm", e.isUnread ? "font-semibold" : "text-muted-foreground")}>{e.from.replace(/<.*>/, "").trim() || e.from}</span>
                        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{relativeTime(e.receivedAt)}</span>
                      </div>
                      <p className={cn("mt-0.5 truncate text-sm", e.isUnread && "font-medium")}>{e.subject}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={CATEGORY_BADGE[e.category]}>{e.category}</Badge>
                        <p className="truncate text-xs text-muted-foreground">{e.reason ?? e.snippet}</p>
                      </div>
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Detail */}
        <div className={cn(!selectedId && "hidden lg:block")}>
          {!selectedId ? (
            <Card className="flex min-h-[400px] flex-col items-center justify-center text-center">
              <Mail className="mb-3 h-10 w-10 text-cyan/60" />
              <p className="text-sm text-muted-foreground">Select an email to read, summarize or draft a reply.</p>
            </Card>
          ) : detail.loading || !email ? (
            <Card><div className="space-y-3"><div className="skeleton h-8 w-2/3" /><div className="skeleton h-4 w-1/3" /><div className="skeleton h-64" /></div></Card>
          ) : (
            <Card key={email.id}>
              <button onClick={() => select(null)} className="mb-3 inline-flex items-center gap-1 text-xs text-cyan lg:hidden"><ArrowLeft className="h-3 w-3" /> Back</button>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Badge variant={CATEGORY_BADGE[email.category]}>{email.category}</Badge>
                  <h2 className="mt-2 font-sans text-xl font-semibold tracking-normal">{email.subject}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {email.from} · {new Date(email.receivedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={summarize} disabled={summarizing}><Sparkles className={cn(summarizing && "animate-spin")} /> Summarize</Button>
                  <Button size="sm" onClick={() => setReplyOpen(true)}><Reply /> Draft reply</Button>
                </div>
              </div>

              <AnimatePresence>
                {summary && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 overflow-hidden rounded-lg border border-violet/40 bg-violet/10 p-4">
                    <p className="mb-2 flex items-center gap-2 font-display text-[11px] uppercase tracking-[0.2em] text-violet"><Sparkles className="h-3.5 w-3.5" /> AI summary</p>
                    <p className="text-sm font-medium">{summary.tldr}</p>
                    {summary.keyPoints.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-foreground/85">{summary.keyPoints.map((p, i) => <li key={i}>{p}</li>)}</ul>
                    )}
                    {summary.actionItems.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gold">Action items</p>
                        <ul className="mt-1 space-y-1 text-sm">{summary.actionItems.map((p, i) => <li key={i}>☐ {p}</li>)}</ul>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-5 border-t pt-4">
                <SafeEmailBody html={email.html} text={email.text} />
              </div>
            </Card>
          )}
        </div>
      </div>

      {email && <ReplyDialog open={replyOpen} onOpenChange={setReplyOpen} email={email} onCreated={onDraftCreated} />}
      <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} onCreated={onDraftCreated} />
      <DraftReview
        draft={reviewDraft}
        onClose={() => setReviewDraft(null)}
        onChanged={(d) => {
          inbox.mutate((x) => (x ? { ...x, drafts: d.status === "PENDING" ? x.drafts.map((y) => (y.id === d.id ? d : y)) : x.drafts.filter((y) => y.id !== d.id) } : x));
          setReviewDraft(d.status === "PENDING" ? d : null);
        }}
      />
    </div>
  );
}

const TONES: { value: Tone; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "formal", label: "Formal" },
  { value: "brief", label: "Brief" },
];

function ToneSelector({ value, onChange }: { value: Tone; onChange: (t: Tone) => void }) {
  return (
    <div role="radiogroup" aria-label="Tone" className="flex gap-2">
      {TONES.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn("flex-1 rounded-md border px-3 py-2 text-sm transition-all", value === t.value ? "border-cyan/60 bg-cyan/10 text-cyan shadow-glow" : "text-muted-foreground hover:text-foreground")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ReplyDialog({ open, onOpenChange, email, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; email: EmailDetail; onCreated: (d: EmailDraft) => void }) {
  const toast = useToast();
  const [tone, setTone] = useState<Tone>("friendly");
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { draft } = await api<{ draft: EmailDraft }>("/api/email/ai-draft", { method: "POST", json: { mode: "reply", emailId: email.id, tone, instructions } });
      onOpenChange(false);
      setInstructions("");
      onCreated(draft);
    } catch (err) {
      toast({ kind: "error", title: "Draft failed", body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Draft a reply" description={`Re: ${email.subject}`}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label>Tone</Label>
            <ToneSelector value={tone} onChange={setTone} />
          </div>
          <div>
            <Label htmlFor="r-ins">What should it say? (optional)</Label>
            <Textarea id="r-ins" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Agree to the new terms, ask for the redline by 6pm" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}><Sparkles className={cn(busy && "animate-spin")} /> {busy ? "Drafting…" : "Generate draft"}</Button>
          <p className="text-center text-xs text-muted-foreground">You&apos;ll review and edit before anything is sent.</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComposeDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (d: EmailDraft) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ to: "", subject: "", instructions: "", tone: "friendly" as Tone });
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { draft } = await api<{ draft: EmailDraft }>("/api/email/ai-draft", { method: "POST", json: { mode: "compose", ...form } });
      onOpenChange(false);
      setForm({ to: "", subject: "", instructions: "", tone: form.tone });
      onCreated(draft);
    } catch (err) {
      toast({ kind: "error", title: "Draft failed", body: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Compose with AI" description="Jarvis writes the first draft. You approve before it's sent.">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="c-to">To</Label>
            <Input id="c-to" type="text" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} placeholder="name@example.com" />
          </div>
          <div>
            <Label htmlFor="c-sub">Subject (optional)</Label>
            <Input id="c-sub" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label>Tone</Label>
            <ToneSelector value={form.tone} onChange={(tone) => setForm({ ...form, tone })} />
          </div>
          <div>
            <Label htmlFor="c-ins">What do you want to say?</Label>
            <Textarea id="c-ins" required value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="e.g. Ask Rahul for a 30-min sync on the roadmap next week" />
          </div>
          <Button type="submit" className="w-full" disabled={busy}><Sparkles className={cn(busy && "animate-spin")} /> {busy ? "Drafting…" : "Generate draft"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Review → edit → explicit approve. The ONLY UI path that can send an email. */
function DraftReview({ draft, onClose, onChanged }: { draft: EmailDraft | null; onClose: () => void; onChanged: (d: EmailDraft) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ to: "", cc: "", subject: "", body: "" });
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (draft) setForm({ to: draft.to, cc: draft.cc ?? "", subject: draft.subject, body: draft.body });
    setConfirming(false);
  }, [draft]);

  if (!draft) return null;
  const dirty = form.to !== draft.to || (form.cc || "") !== (draft.cc ?? "") || form.subject !== draft.subject || form.body !== draft.body;

  const save = async () => {
    const { draft: d } = await api<{ draft: EmailDraft }>(`/api/email/drafts/${draft.id}`, { method: "PATCH", json: { to: form.to, cc: form.cc || null, subject: form.subject, body: form.body } });
    onChanged(d);
    return d;
  };

  const approveAndSend = async () => {
    setBusy(true);
    try {
      const d = dirty ? await save() : draft;
      const res = await api<{ ok: boolean; mock: boolean }>(`/api/email/drafts/${d.id}/send`, { method: "POST", json: { approved: true, bodyChecksum: draftChecksum(d) } });
      toast({ kind: "success", title: res.mock ? "Sent (demo: not actually delivered)" : "Email sent", body: `To ${d.to}` });
      onChanged({ ...d, status: "SENT" });
      onClose();
    } catch (e) {
      toast({ kind: "error", title: "Send failed", body: (e as Error).message });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const discard = async () => {
    await api(`/api/email/drafts/${draft.id}`, { method: "DELETE" });
    onChanged({ ...draft, status: "DISCARDED" });
    onClose();
  };

  return (
    <Dialog open={Boolean(draft)} onOpenChange={(v) => !v && onClose()}>
      <DialogContent title="Review draft" description="Edit anything. Nothing is sent until you approve." className="max-w-2xl">
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="d-to">To</Label>
              <Input id="d-to" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="d-cc">Cc</Label>
              <Input id="d-cc" value={form.cc} onChange={(e) => setForm({ ...form, cc: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="d-sub">Subject</Label>
            <Input id="d-sub" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="d-body">Message</Label>
            <Textarea id="d-body" className="min-h-[240px] font-sans" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </div>

          {confirming ? (
            <div className="rounded-lg border border-magenta/50 bg-magenta/10 p-4">
              <p className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-magenta" /> Send this email to {form.to}?</p>
              <p className="mt-1 text-xs text-muted-foreground">This can&apos;t be undone.</p>
              <div className="mt-3 flex gap-2">
                <Button variant="accent" onClick={approveAndSend} disabled={busy}><Send /> {busy ? "Sending…" : "Yes, send it"}</Button>
                <Button variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setConfirming(true)}><ShieldCheck /> Approve &amp; send</Button>
              <Button variant="outline" disabled={!dirty} onClick={() => save().then(() => toast({ kind: "success", title: "Draft saved" }))}><FileText /> Save</Button>
              <Button variant="ghost" className="ml-auto text-danger" onClick={discard}><Trash2 /> Discard</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function EmailPage() {
  return (
    <Suspense>
      <EmailInner />
    </Suspense>
  );
}
