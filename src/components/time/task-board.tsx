"use client";
import { useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, GripVertical, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_BADGE } from "@/lib/ui";
import type { Bucket, Task } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLUMNS: { id: Exclude<Bucket, "DONE">; label: string; accent: string }[] = [
  { id: "TODAY", label: "Today", accent: "from-cyan" },
  { id: "WEEK", label: "This Week", accent: "from-violet" },
  { id: "LATER", label: "Later", accent: "from-magenta" },
];

const RANK = { P1: 0, P2: 1, P3: 2, P4: 3 };

export function TaskBoard({ tasks, onMove, onComplete, onDelete }: { tasks: Task[]; onMove: (id: string, bucket: Bucket) => void; onComplete: (id: string) => void; onDelete: (id: string) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const [showDone, setShowDone] = useState(false);

  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id as Bucket | undefined;
    const task = tasks.find((t) => t.id === e.active.id);
    if (to && task && task.bucket !== to) onMove(task.id, to);
  };

  const done = tasks.filter((t) => t.bucket === "DONE");

  return (
    <div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-3">
          {COLUMNS.map((c) => (
            <Column key={c.id} id={c.id} label={c.label} accent={c.accent} count={tasks.filter((t) => t.bucket === c.id).length}>
              <AnimatePresence initial={false}>
                {tasks
                  .filter((t) => t.bucket === c.id)
                  .sort((a, b) => RANK[a.priority] - RANK[b.priority] || a.order - b.order)
                  .map((t) => (
                    <TaskCard key={t.id} task={t} onComplete={onComplete} onDelete={onDelete} onMove={onMove} />
                  ))}
              </AnimatePresence>
            </Column>
          ))}
        </div>
      </DndContext>
      {done.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setShowDone(!showDone)} className="text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground">
            {showDone ? "Hide" : "Show"} completed ({done.length})
          </button>
          {showDone && (
            <ul className="mt-2 space-y-1">
              {done.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm text-muted-foreground line-through">
                  <Check className="h-3.5 w-3.5 text-success" /> {t.title}
                  <button onClick={() => onMove(t.id, "TODAY")} className="ml-2 text-xs text-cyan no-underline hover:underline">Restore</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Column({ id, label, accent, count, children }: { id: Bucket; label: string; accent: string; count: number; children: React.ReactNode }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <section ref={setNodeRef} aria-label={label} className={cn("glass min-h-[220px] rounded-lg p-3 transition-all", isOver && "neon-border")}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
          <span className={cn("h-2 w-2 rounded-full bg-gradient-to-r to-transparent", accent)} />
          {label}
        </h3>
        <span className="rounded-full bg-foreground/5 px-2 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
      {count === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Drop tasks here</p>}
    </section>
  );
}

function TaskCard({ task, onComplete, onDelete, onMove }: { task: Task; onComplete: (id: string) => void; onDelete: (id: string) => void; onMove: (id: string, b: Bucket) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const overdue = task.dueAt && new Date(task.dueAt) < new Date();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn("group relative rounded-md border bg-background/40 p-3 backdrop-blur", isDragging && "z-50 shadow-glow")}
    >
      <div className="flex items-start gap-2">
        <button {...listeners} {...attributes} className="mt-0.5 cursor-grab touch-none text-muted-foreground active:cursor-grabbing" aria-label={`Drag ${task.title}`}>
          <GripVertical className="h-4 w-4" />
        </button>
        <button
          onClick={() => onComplete(task.id)}
          className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-cyan/50 hover:bg-cyan/20"
          aria-label={`Complete ${task.title}`}
        >
          <Check className="h-3 w-3 text-cyan opacity-0 group-hover:opacity-60" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant={PRIORITY_BADGE[task.priority]}>{task.priority}</Badge>
            {task.tags.map((t) => (
              <span key={t} className="rounded bg-violet/10 px-1.5 text-[10px] text-violet">#{t}</span>
            ))}
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground"><Clock className="h-3 w-3" />{task.estimateMin}m</span>
            {task.dueAt && (
              <span className={cn("text-[10px]", overdue ? "text-danger" : "text-muted-foreground")}>
                due {new Date(task.dueAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => onDelete(task.id)} className="text-muted-foreground opacity-0 transition-opacity hover:text-danger focus:opacity-100 group-hover:opacity-100" aria-label={`Delete ${task.title}`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Keyboard/touch-friendly move */}
      <select
        aria-label="Move to"
        value={task.bucket}
        onChange={(e) => onMove(task.id, e.target.value as Bucket)}
        className="mt-2 w-full rounded border bg-transparent px-1 py-0.5 text-[11px] text-muted-foreground md:hidden [&>option]:bg-popover"
      >
        <option value="TODAY">Today</option>
        <option value="WEEK">This Week</option>
        <option value="LATER">Later</option>
      </select>
    </motion.div>
  );
}
