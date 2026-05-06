import { z } from "zod"

export const purchaseFilterSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "draft", "approved"]).default("all"),
})

export type PurchaseFilterInput = z.infer<typeof purchaseFilterSchema>
