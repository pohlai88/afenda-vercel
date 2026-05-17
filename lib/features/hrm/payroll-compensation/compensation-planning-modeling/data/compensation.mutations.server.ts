import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmCompensationComponent,
  hrmContractCompensationLine,
} from "#lib/db/schema"

import {
  HRM_COMPENSATION_COMPONENT_CODES,
  type HrmCompensationComponentCode,
} from "../schema/contract-compensation.shared"

/** Query surface used by compensation line writers (root `db` or `db.transaction` `tx`). */
export type HrmCompensationDbClient = Pick<typeof db, "insert" | "select">

const DEFAULT_LABELS: Record<HrmCompensationComponentCode, string> = {
  MEAL_ALLOWANCE: "Meal allowance",
  PHONE_ALLOWANCE: "Phone allowance",
  FUEL_ALLOWANCE: "Fuel allowance",
  PERF_ALLOWANCE: "Performance allowance",
  KPI_AMOUNT: "KPI amount",
}

const DEFAULT_SORT: Record<HrmCompensationComponentCode, number> = {
  MEAL_ALLOWANCE: 10,
  PHONE_ALLOWANCE: 20,
  FUEL_ALLOWANCE: 30,
  PERF_ALLOWANCE: 40,
  KPI_AMOUNT: 50,
}

/** Idempotent seed of Viet-ERP–aligned component rows for an organization. */
export async function ensureDefaultHrmCompensationComponents(
  organizationId: string
): Promise<void> {
  const rows = HRM_COMPENSATION_COMPONENT_CODES.map((code) => ({
    id: crypto.randomUUID(),
    organizationId,
    code,
    label: DEFAULT_LABELS[code],
    taxTreatment: "taxable" as const,
    statutoryBaseTreatment: "included" as const,
    sortOrder: DEFAULT_SORT[code],
    isActive: true,
  }))

  for (const row of rows) {
    await db
      .insert(hrmCompensationComponent)
      .values(row)
      .onConflictDoNothing({
        target: [
          hrmCompensationComponent.organizationId,
          hrmCompensationComponent.code,
        ],
      })
  }
}

export type ContractCompensationLineInput = {
  readonly componentId: string
  readonly amount: string
  readonly currency: string
}

export async function insertContractCompensationLines(
  organizationId: string,
  contractId: string,
  lines: readonly ContractCompensationLineInput[],
  client: HrmCompensationDbClient = db
): Promise<void> {
  if (lines.length === 0) return
  await client.insert(hrmContractCompensationLine).values(
    lines.map((l) => ({
      id: crypto.randomUUID(),
      organizationId,
      contractId,
      componentId: l.componentId,
      amount: l.amount,
      currency: l.currency,
    }))
  )
}

export async function copyContractCompensationLines(
  organizationId: string,
  fromContractId: string,
  toContractId: string,
  client: HrmCompensationDbClient = db
): Promise<void> {
  const existing = await client
    .select({
      componentId: hrmContractCompensationLine.componentId,
      amount: hrmContractCompensationLine.amount,
      currency: hrmContractCompensationLine.currency,
    })
    .from(hrmContractCompensationLine)
    .where(eq(hrmContractCompensationLine.contractId, fromContractId))

  if (existing.length === 0) return

  await insertContractCompensationLines(
    organizationId,
    toContractId,
    existing.map((r) => ({
      componentId: r.componentId,
      amount: String(r.amount),
      currency: r.currency,
    })),
    client
  )
}
