import { z } from "zod"

import { ONETHING_SEVERITIES } from "../constants"

export const onethingImportRowSchema = z.object({
  title: z.string().trim().min(1).max(500),
  consequence: z.string().trim().max(20_000).optional().default(""),
  severity: z.enum(ONETHING_SEVERITIES).optional().default("medium"),
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

export type OneThingImportRow = z.infer<typeof onethingImportRowSchema>
