import { z } from "zod"

import { TODO_PRIORITIES } from "../constants"

export const todoImportRowSchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(20_000).optional().default(""),
  priority: z.enum(TODO_PRIORITIES).optional().default("normal"),
  due_at: z.string().trim().optional().default(""),
  list_slug: z.string().trim().max(64).optional().default(""),
  assignee_email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine(
      (s) => s === "" || z.string().email().safeParse(s).success,
      "Invalid assignee email"
    ),
})

export type TodoImportRow = z.infer<typeof todoImportRowSchema>
