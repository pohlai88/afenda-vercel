export type SaleOverviewItem = {
  id: string
  code: string
  status: "draft" | "confirmed"
}

export type SaleActionState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<"form", string>>
    }
