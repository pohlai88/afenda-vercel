import { z } from "zod"

export const saleFilterSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "draft", "confirmed"]).default("all"),
})

export type SaleFilterInput = z.infer<typeof saleFilterSchema>
