"use client";
import { useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, CalendarDays, CalendarPlus, Lightbulb, Plus, Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FocusTimer } from "@/components/time/focus-timer";
import { TaskBoard } from "@/components/time/task-board";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { api, useApi } from "@/lib/client";
import type { Bucket, CalendarEvent, FocusSession, FocusSuggestion, Priority, Task } from "@/lib/types";
import { cn, formatTime } from "@/lib/utils";

function toLocalInput(d: Date) {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function TimePage() {
  const toast = useToast();
  const tasksQ = useApi<{ tasks: Task[] }>("/api/tasks");
  const eventsQ = useApi<{ events: CalendarEvent[]; source: string }>("/api/calendar?days=1", { refreshMs: 300_000 });
  const focusQ = useApi<{ sessions: FocusSession[] }>("/api/focus?days=7");
  const nudgesQ = useApi<{ nudges: string[] }>("/api/nudges", { refreshMs: 300_000 });

  const [taskOpen, setTaskOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<FocusSuggestion[] | null>(null);
  const [scheduling, setScheduling] = useState(false);

  const tasks = useMemo(() => tasksQ.data?.tasks ?? [], [tasksQ.data]);
  const setTasks = (fn: (t: Task[]) => Task[]) => tasksQ.mutate((d) => ({ tasks: fn(d?.tasks ?? []) }));

  const patchTask = async (id: string, patch: Partial<Task>) => {
    const prev = tasks;
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    try {
      await api(`/api/tasks/${id}`, { method: "PATCH", json: patch });
    } catch (e) {
      setTasks(() => prev);
      toast({ kind: "error", title: "Update failed", body: (e as Error).message });
    }
  };

  const deleteTask = async (id: string) => {
    const prev = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== id));
    try {
      await api(`/api/tasks/${id}`, { method: "DELETE" });
    } catch {
      setTasks(() => prev);
    }
  };

  const autoSchedule = async () => {
    setScheduling(true);
    try {
      const res = await api<{ suggestions: FocusSuggestion[]; source: string }>("/api/schedule", { method: "POST" });
      setSuggestions(res.suggestions);
      if (!res.suggestions.length) toast({ kind: "info", title: "No free gaps left in today's workday" });
    } catch (e) {
      toast({ kind: "error", title: "Auto-schedule failed", body: (e as Error).message });
    } finally {
      setScheduling(false);
    }
  };

  const book = async (s: FocusSuggestion) => {
    try {
      const { event } = await api<{ event: CalendarEvent }>("/api/calendar", { method: "POST", json: { title: `🎯 Focus: ${s.title}`, start: s.start, end: s.end, description: s.reason } });
      eventsQ.mutate((d) => ({ source: d?.source ?? "google", events: [...(d?.events ?? []), event].sort((a, b) => a.start.localeCompare(b.start)) }));
      setSuggestions((x) => x?.filter((y) => y !== s) ?? null);
      toast({ kind: "success", title: "Focus block booked", body: `${formatTime(s.start)} – ${formatTime(s.end)}` });
    } catch (e) {
      toast({ kind: "error", title: "Couldn't book", body: (e as Error).message });
    }
  };

  // Weekly analytics: focus minutes + tasks completed per day
  const weekly = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map((d) => {
      const key = d.toDateString();
      return {
        day: d.toLocaleDateString([], { weekday: "short" }),
        focus: (focusQ.data?.sessions ?? []).filter((s) => s.kind === "focus" && new Date(s.startedAt).toDateString() === key).reduce((a, s) => a + s.minutes, 0),
        completed: tasks.filter((t) => t.completedAt && new Date(t.completedAt).toDateString() === key).length,
      };
    });
  }, [focusQ.data, tasks]);
  const weekFocus = weekly.reduce((a, d) => a + d.focus, 0);

  return (
    <div>
      <PageHeader
        title="Time Management"
        subtitle="Plan, focus and protect your time."
        actions={
          <>
            <Button variant="outline" onClick={() => setEventOpen(true)}><CalendarPlus /> Event</Button>
            <Button variant="secondary" onClick={autoSchedule} disabled={scheduling}><Wand2 className={cn(scheduling && "animate-spin")} /> Auto-schedule</Button>
            <Button onClick={() => setTaskOpen(true)}><Plus /> Task</Button>
          </>
        }
      />

      {nudgesQ.data?.nudges?.length ? (
        <div className="mb-6 space-y-2">
          {nudgesQ.data.nudges.map((n, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-sm text-gold">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /> {n}
            </div>
          ))}
        </div>
      ) : null}

      {suggestions && suggestions.length > 0 && (
        <Card className="mb-6 border-violet/40">
          <CardHeader icon={<Sparkles />} title="Suggested focus blocks" subtitle="Nothing is booked until you accept" action={<Button size="sm" variant="ghost" onClick={() => setSuggestions(null)}>Dismiss</Button>} />
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((s, i) => (
              <div key={i} className="rounded-lg border bg-foreground/[0.02] p-3">
                <p className="font-mono text-xs text-cyan">{formatTime(s.start)} – {formatTime(s.end)}</p>
                <p className="mt-1 text-sm font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
                <Button size="sm" className="mt-3" onClick={() => book(s)}><CalendarPlus /> Book it</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {tasksQ.loading ? (
            <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-56" />)}</div>
          ) : (
            <TaskBoard
              tasks={tasks}
              onMove={(id, bucket) => patchTask(id, { bucket })}
              onComplete={(id) => {
                void patchTask(id, { bucket: "DONE", completedAt: new Date().toISOString() });
                toast({ kind: "success", title: "Task completed ✓" });
              }}
              onDelete={deleteTask}
            />
          )}

          <Card delay={0.2}>
            <CardHeader icon={<BarChart3 />} title="Weekly Productivity" subtitle={`${Math.round(weekFocus / 60 * 10) / 10}h focused · ${weekly.reduce((a, d) => a + d.completed, 0)} tasks done`} />
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weekly} margin={{ left: -16, right: 0, top: 8 }}>
                  <defs>
                    <linearGradient id="focusBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2EE6E6" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#FF8A1F" stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 6" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fill: "currentColor", fontSize: 11, opacity: 0.7 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "rgba(6,14,18,0.95)", border: "1px solid rgba(46,230,230,0.3)", borderRadius: 8, color: "#fff" }} cursor={{ fill: "rgba(46,230,230,0.05)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="focus" name="Focus minutes" fill="url(#focusBar)" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Line yAxisId="r" dataKey="completed" name="Tasks completed" stroke="#FF2A4D" strokeWidth={2} dot={{ r: 3, fill: "#FF2A4D" }} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <FocusTimer tasks={tasks} sessions={focusQ.data?.sessions ?? []} onSession={(s) => focusQ.mutate((d) => ({ sessions: [...(d?.sessions ?? []), s] }))} />

          <Card delay={0.15}>
            <CardHeader icon={<CalendarDays />} title="Agenda" subtitle={eventsQ.data?.source === "mock" ? "Sample calendar" : "Google Calendar"} />
            {eventsQ.loading ? (
              <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10" />)}</div>
            ) : (
              <ul className="space-y-2">
                {(eventsQ.data?.events ?? []).map((e) => (
                  <li key={e.id} className={cn("flex gap-3 rounded-md border-l-2 border-cyan/60 bg-foreground/[0.02] px-3 py-2", new Date(e.end) < new Date() && "opacity-50")}>
                    <span className="w-16 shrink-0 font-mono text-xs text-cyan">{e.allDay ? "All day" : formatTime(e.start)}</span>
                    <span className="text-sm">{e.title}</span>
                  </li>
                ))}
                {eventsQ.data?.events.length === 0 && <p className="text-sm text-muted-foreground">No events today.</p>}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <NewTaskDialog open={taskOpen} onOpenChange={setTaskOpen} onCreated={(t) => setTasks((ts) => [...ts, t])} />
      <NewEventDialog open={eventOpen} onOpenChange={setEventOpen} onCreated={(e) => eventsQ.mutate((d) => ({ source: d?.source ?? "google", events: [...(d?.events ?? []), e].sort((a, b) => a.start.localeCompare(b.start)) }))} />
    </div>
  );
}

function NewTaskDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (t: Task) => void }) {
  const toast = useToast();
  const [form, setForm] = useState({ title: "", priority: "P2" as Priority, bucket: "TODAY" as Bucket, tags: "", dueAt: "", estimateMin: 30 });
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { task } = await api<{ task: Task }>("/api/tasks", {
        method: "POST",
        json: {
          title: form.title,
          priority: form.priority,
          bucket: form.bucket,
          tags: form.tags.split(/[,\s]+/).map((t) => t.replace(/^#/, "")).filter(Boolean),
          dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
          estimateMin: form.estimateMin,
        },
      });
      onCreated(task);
      onOpenChange(false);
      setForm({ ...form, title: "", tags: "", dueAt: "" });
    } catch (err) {
      toast({ kind: "error", title: "Couldn't create task", body: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New task">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="t-title">Title</Label>
            <Input id="t-title" required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="What needs doing?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="t-pri">Priority</Label>
              <Select id="t-pri" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as Priority })}>
                <option value="P1">P1 · Critical</option>
                <option value="P2">P2 · High</option>
                <option value="P3">P3 · Normal</option>
                <option value="P4">P4 · Low</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-bucket">When</Label>
              <Select id="t-bucket" value={form.bucket} onChange={(e) => setForm({ ...form, bucket: e.target.value as Bucket })}>
                <option value="TODAY">Today</option>
                <option value="WEEK">This Week</option>
                <option value="LATER">Later</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="t-due">Due</Label>
              <Input id="t-due" type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="t-est">Estimate (min)</Label>
              <Input id="t-est" type="number" min={5} max={600} step={5} value={form.estimateMin} onChange={(e) => setForm({ ...form, estimateMin: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label htmlFor="t-tags">Tags</Label>
            <Input id="t-tags" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="work, deep" />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Saving…" : "Add task"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewEventDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: (e: CalendarEvent) => void }) {
  const toast = useToast();
  const initial = () => {
    const s = new Date();
    s.setMinutes(0, 0, 0);
    s.setHours(s.getHours() + 1);
    return { title: "", start: toLocalInput(s), end: toLocalInput(new Date(s.getTime() + 3600_000)), location: "" };
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { event } = await api<{ event: CalendarEvent }>("/api/calendar", {
        method: "POST",
        json: { title: form.title, start: new Date(form.start).toISOString(), end: new Date(form.end).toISOString(), location: form.location || undefined },
      });
      onCreated(event);
      onOpenChange(false);
      setForm(initial());
      toast({ kind: "success", title: "Event created" });
    } catch (err) {
      toast({ kind: "error", title: "Couldn't create event", body: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="New calendar event" description="Creates an event on your primary Google Calendar.">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="e-title">Title</Label>
            <Input id="e-title" required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="e-start">Start</Label>
              <Input id="e-start" type="datetime-local" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="e-end">End</Label>
              <Input id="e-end" type="datetime-local" required value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="e-loc">Location</Label>
            <Input id="e-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>{saving ? "Creating…" : "Create event"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

