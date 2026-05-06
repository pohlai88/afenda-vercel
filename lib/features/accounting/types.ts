export type AccountingOverviewItem = {
  id: string
  reference: string
  status: "draft" | "posted"
}

export type AccountingActionState =
  | undefined
  | { ok: true }
  | {
      ok: false
      errors: Partial<Record<"form", string>>
    }
