import { z } from "zod"

export const accountingFilterSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "draft", "posted"]).default("all"),
})

export type AccountingFilterInput = z.infer<typeof accountingFilterSchema>
