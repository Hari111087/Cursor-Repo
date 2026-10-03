import { z } from "zod";

export const TaskBody = z.object({
  title: z.string().min(1).max(300),
  notes: z.string().max(5000).nullable().optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  bucket: z.enum(["TODAY", "WEEK", "LATER", "DONE"]).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  dueAt: z.string().datetime({ offset: true }).nullable().optional(),
  estimateMin: z.number().int().min(5).max(600).optional(),
  order: z.number().int().optional(),
});

export const SymbolSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9.\-^=]+$/, "Invalid symbol")
  .transform((s) => s.toUpperCase());

export const EmailAddressList = z
  .string()
  .min(3)
  .max(1000)
  .refine((s) => s.split(",").every((p) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(p.replace(/^.*<|>$/g, "").trim())), "Invalid email address");
