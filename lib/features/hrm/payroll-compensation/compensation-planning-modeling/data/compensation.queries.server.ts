import "server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmCompensationComponent,
  hrmContractCompensationLine,
} from "#lib/db/schema"

import type {
  HrmCompensationSnapshotEntry,
  HrmContractAnnexSlot,
} from "../schema/contract-compensation.shared"
import {
  hrmCompensationSnapshotSchema,
  hrmContractAnnexSlotsSchema,
} from "../schema/contract-compensation.shared"

export type HrmCompensationComponentRow = {
  id: string
  organizationId: string
  code: string
  label: string
  taxTreatment: string
  statutoryBaseTreatment: string
  sortOrder: number
  isActive: boolean
}

export async function listCompensationComponentsForOrg(
  organizationId: string
): Promise<HrmCompensationComponentRow[]> {
  return db
    .select({
      id: hrmCompensationComponent.id,
      organizationId: hrmCompensationComponent.organizationId,
      code: hrmCompensationComponent.code,
      label: hrmCompensationComponent.label,
      taxTreatment: hrmCompensationComponent.taxTreatment,
      statutoryBaseTreatment: hrmCompensationComponent.statutoryBaseTreatment,
      sortOrder: hrmCompensationComponent.sortOrder,
      isActive: hrmCompensationComponent.isActive,
    })
    .from(hrmCompensationComponent)
    .where(
      and(
        eq(hrmCompensationComponent.organizationId, organizationId),
        eq(hrmCompensationComponent.isActive, true)
      )
    )
    .orderBy(
      asc(hrmCompensationComponent.sortOrder),
      asc(hrmCompensationComponent.code)
    )
}

export async function buildCompensationSnapshotForContract(
  organizationId: string,
  contractId: string
): Promise<HrmCompensationSnapshotEntry[]> {
  const rows = await db
    .select({
      code: hrmCompensationComponent.code,
      amount: hrmContractCompensationLine.amount,
      currency: hrmContractCompensationLine.currency,
      taxTreatment: hrmCompensationComponent.taxTreatment,
      statutoryBaseTreatment: hrmCompensationComponent.statutoryBaseTreatment,
    })
    .from(hrmContractCompensationLine)
    .innerJoin(
      hrmCompensationComponent,
      eq(hrmContractCompensationLine.componentId, hrmCompensationComponent.id)
    )
    .where(
      and(
        eq(hrmContractCompensationLine.organizationId, organizationId),
        eq(hrmContractCompensationLine.contractId, contractId)
      )
    )

  const snapshot: HrmCompensationSnapshotEntry[] = []
  for (const r of rows) {
    const amt =
      typeof r.amount === "string" ? r.amount : String(r.amount ?? "0")
    snapshot.push({
      componentCode: r.code,
      amount: amt,
      currency: r.currency,
      taxTreatment: r.taxTreatment,
      statutoryBaseTreatment: r.statutoryBaseTreatment,
    })
  }
  const parsed = hrmCompensationSnapshotSchema.safeParse(snapshot)
  return parsed.success ? parsed.data : []
}

export async function listContractAllowancesForEngine(
  organizationId: string,
  contractId: string
): Promise<
  ReadonlyArray<{
    code: string
    amount: string
    currency: string
    taxTreatment: string
    statutoryBaseTreatment: string
  }>
> {
  const snap = await buildCompensationSnapshotForContract(
    organizationId,
    contractId
  )
  return snap.map((s) => ({
    code: s.componentCode,
    amount: s.amount,
    currency: s.currency,
    taxTreatment: s.taxTreatment,
    statutoryBaseTreatment: s.statutoryBaseTreatment,
  }))
}

export type ContractCompensationLineSummary = {
  contractId: string
  code: string
  amount: string
  currency: string
}

export async function listCompensationLineSummariesForContracts(
  organizationId: string,
  contractIds: readonly string[]
): Promise<ContractCompensationLineSummary[]> {
  if (contractIds.length === 0) return []
  return db
    .select({
      contractId: hrmContractCompensationLine.contractId,
      code: hrmCompensationComponent.code,
      amount: hrmContractCompensationLine.amount,
      currency: hrmContractCompensationLine.currency,
    })
    .from(hrmContractCompensationLine)
    .innerJoin(
      hrmCompensationComponent,
      eq(hrmContractCompensationLine.componentId, hrmCompensationComponent.id)
    )
    .where(
      and(
        eq(hrmContractCompensationLine.organizationId, organizationId),
        inArray(hrmContractCompensationLine.contractId, [...contractIds])
      )
    )
    .then((rows) =>
      rows.map((r) => ({
        contractId: r.contractId,
        code: r.code,
        amount: typeof r.amount === "string" ? r.amount : String(r.amount),
        currency: r.currency,
      }))
    )
}

export function parseStoredAnnexSlots(
  raw: unknown
): HrmContractAnnexSlot[] | null {
  if (raw == null) return null
  const parsed = hrmContractAnnexSlotsSchema.safeParse(raw)
  return parsed.success ? parsed.data : null
}

export function parseStoredCompensationSnapshot(
  raw: unknown
): HrmCompensationSnapshotEntry[] {
  const parsed = hrmCompensationSnapshotSchema.safeParse(raw ?? [])
  return parsed.success ? parsed.data : []
}
