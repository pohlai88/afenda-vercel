import { z } from "zod"

export const inventoryFilterSchema = z.object({
  query: z.string().trim().max(100).optional().default(""),
  status: z.enum(["all", "available", "reserved"]).default("all"),
})

export type InventoryFilterInput = z.infer<typeof inventoryFilterSchema>
