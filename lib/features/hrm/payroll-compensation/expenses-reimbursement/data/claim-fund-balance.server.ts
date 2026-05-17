import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmClaim, hrmExpenseFund } from "#lib/db/schema"

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export async function deductExpenseFundBalanceOnApprove(
  tx: DbTx,
  input: {
    readonly organizationId: string
    readonly expenseFundId: string | null
    readonly approvedAmount: number
    readonly updatedByUserId: string
    readonly now: Date
  }
): Promise<void> {
  if (!input.expenseFundId || input.approvedAmount <= 0) return

  const fund = await tx.query.hrmExpenseFund.findFirst({
    where: and(
      eq(hrmExpenseFund.organizationId, input.organizationId),
      eq(hrmExpenseFund.id, input.expenseFundId),
      eq(hrmExpenseFund.state, "active")
    ),
    columns: { id: true, currentBalance: true },
  })
  if (!fund) return

  const current = Number(fund.currentBalance)
  const next = Math.max(0, current - input.approvedAmount)

  await tx
    .update(hrmExpenseFund)
    .set({
      currentBalance: String(next),
      updatedAt: input.now,
      updatedByUserId: input.updatedByUserId,
    })
    .where(eq(hrmExpenseFund.id, fund.id))
}

export async function resolveClaimExpenseFundId(
  organizationId: string,
  claimId: string
): Promise<string | null> {
  const row = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.organizationId, organizationId),
      eq(hrmClaim.id, claimId)
    ),
    columns: { expenseFundId: true, reimbursementMode: true },
  })
  if (!row?.expenseFundId) return null
  if (row.reimbursementMode !== "petty_cash_fund") return null
  return row.expenseFundId
}
