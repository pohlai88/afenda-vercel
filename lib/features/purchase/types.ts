export type PurchaseOverviewItem = {
  id: string
  code: string
  status: "draft" | "approved"
}

export type PurchaseActionState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<"form", string>>
    }
