import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmExpenseFund } from "#lib/db/schema"

export type ExpenseFundRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly currency: string
  readonly fundKind: string
  readonly state: string
  readonly custodianEmployeeId: string | null
  readonly floatLimit: string | null
  readonly currentBalance: string
  readonly defaultCostCenterCode: string | null
  readonly defaultFinanceAccountCode: string | null
  readonly defaultProjectCode: string | null
  readonly defaultTaxTreatment: string
  readonly eligibilityRules: unknown
  readonly policyRules: unknown
  readonly policyVersion: string | null
}

export async function listExpenseFundsForOrg(
  organizationId: string,
  options: { activeOnly?: boolean } = {}
): Promise<readonly ExpenseFundRow[]> {
  const rows = await db
    .select({
      id: hrmExpenseFund.id,
      code: hrmExpenseFund.code,
      name: hrmExpenseFund.name,
      currency: hrmExpenseFund.currency,
      fundKind: hrmExpenseFund.fundKind,
      state: hrmExpenseFund.state,
      custodianEmployeeId: hrmExpenseFund.custodianEmployeeId,
      floatLimit: hrmExpenseFund.floatLimit,
      currentBalance: hrmExpenseFund.currentBalance,
      defaultCostCenterCode: hrmExpenseFund.defaultCostCenterCode,
      defaultFinanceAccountCode: hrmExpenseFund.defaultFinanceAccountCode,
      defaultProjectCode: hrmExpenseFund.defaultProjectCode,
      defaultTaxTreatment: hrmExpenseFund.defaultTaxTreatment,
      eligibilityRules: hrmExpenseFund.eligibilityRules,
      policyRules: hrmExpenseFund.policyRules,
      policyVersion: hrmExpenseFund.policyVersion,
    })
    .from(hrmExpenseFund)
    .where(
      options.activeOnly
        ? and(
            eq(hrmExpenseFund.organizationId, organizationId),
            eq(hrmExpenseFund.state, "active")
          )
        : eq(hrmExpenseFund.organizationId, organizationId)
    )
    .orderBy(asc(hrmExpenseFund.code))

  return rows
}

export async function isEmployeeExpenseFundCustodian(
  organizationId: string,
  employeeId: string
): Promise<boolean> {
  const row = await db.query.hrmExpenseFund.findFirst({
    where: and(
      eq(hrmExpenseFund.organizationId, organizationId),
      eq(hrmExpenseFund.custodianEmployeeId, employeeId),
      eq(hrmExpenseFund.state, "active")
    ),
    columns: { id: true },
  })
  return Boolean(row)
}

export async function getExpenseFundForOrg(
  organizationId: string,
  expenseFundId: string
): Promise<ExpenseFundRow | null> {
  const row = await db.query.hrmExpenseFund.findFirst({
    where: and(
      eq(hrmExpenseFund.organizationId, organizationId),
      eq(hrmExpenseFund.id, expenseFundId)
    ),
    columns: {
      id: true,
      code: true,
      name: true,
      currency: true,
      fundKind: true,
      state: true,
      custodianEmployeeId: true,
      floatLimit: true,
      currentBalance: true,
      defaultCostCenterCode: true,
      defaultFinanceAccountCode: true,
      defaultProjectCode: true,
      defaultTaxTreatment: true,
      eligibilityRules: true,
      policyRules: true,
      policyVersion: true,
    },
  })
  return row ?? null
}
