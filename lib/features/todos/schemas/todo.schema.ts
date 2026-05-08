import { z } from "zod"

import { TODO_PRIORITIES, TODO_STATES } from "../constants"

export const todoTitleSchema = z.string().trim().min(1).max(500)

export const createOrgTodoSchema = z.object({
  title: todoTitleSchema,
  description: z.string().trim().max(20_000).optional().default(""),
  priority: z.enum(TODO_PRIORITIES).optional().default("normal"),
  dueAt: z.string().optional().nullable(),
  assigneeUserId: z.string().trim().min(1).optional().nullable(),
  listId: z.string().uuid().optional(),
})

export const todoIdSchema = z.object({
  todoId: z.string().uuid(),
})

export const todoCommentSchema = z.object({
  todoId: z.string().uuid(),
  body: z.string().trim().min(1).max(8000),
})

export const todoAttachmentSchema = z.object({
  todoId: z.string().uuid(),
  url: z.string().url().max(2048),
  contentSha256: z.string().regex(/^[a-f0-9]{64}$/),
  mimeType: z.string().min(1).max(128),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024),
})

export function parseOptionalDueAt(
  raw: string | null | undefined
): Date | null {
  if (!raw || raw.trim() === "") return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

export const todoStateSchema = z.enum(TODO_STATES)
