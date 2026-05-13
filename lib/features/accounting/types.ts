import type { ActionResult } from "#features/governed-surface"

export type AccountingOverviewItem = {
  id: string
  reference: string
  status: "draft" | "posted"
}

export type AccountingActionState = ActionResult | undefined
