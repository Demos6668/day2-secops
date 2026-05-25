import { z } from "zod";

export const ChecklistItemStatusSchema = z.enum(["open", "in-progress", "done"]);

export const ChecklistItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  status: ChecklistItemStatusSchema,
  due: z.string().optional(),
  owner: z.string().optional(),
  control: z.string().optional(),
});

export const AuditChecklistSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  owner: z.string().optional(),
  due: z.string().optional(),
  items: z.array(ChecklistItemSchema),
});

export const AuditChecklistsFileSchema = z.object({
  checklists: z.array(AuditChecklistSchema),
});

export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;
export type AuditChecklist = z.infer<typeof AuditChecklistSchema>;
export type AuditChecklistsFile = z.infer<typeof AuditChecklistsFileSchema>;
