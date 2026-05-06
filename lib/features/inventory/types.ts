export type InventoryOverviewItem = {
  id: string
  sku: string
  status: "available" | "reserved"
}

export type InventoryActionState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<"form", string>>
    }
