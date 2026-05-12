import "server-only"

import { and, desc, eq, inArray, isNotNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmComplianceEvidence,
  hrmEmployee,
  hrmPayrollLine,
  hrmPayrollPeriod,
  hrmPayrollRun,
} from "#lib/db/schema"

import type { StatutoryPackRunInput } from "./statutory-pack.server"

// ---------------------------------------------------------------------------
// Compliance evidence list
// ---------------------------------------------------------------------------

export type ComplianceEvidenceRow = {
  id: string
  organizationId: string
  periodId: string | null
  countryCode: string
  packType: string
  inputHash: string
  outputHash: string
  payloadDocumentId: string | null
  rulePackVersion: string
  generatedAt: Date
  generatedByUserId: string | null
  generatedByRunId: string | null
  submissionState: string
  submissionDeliveryId: string | null
  externalReference: string | null
  // Phase 3I: acknowledgement provenance (null until `acknowledged`).
  acknowledgedAt: Date | null
  acknowledgedByUserId: string | null
  acknowledgementSource: string | null
  // Phase 3J: SHA-256 hex of bureau-supplied webhook body (null when ack
  // arrived via manual / future API path that has no hashable payload).
  authorityPayloadHash: string | null
  createdAt: Date
  updatedAt: Date
}

export async function listComplianceEvidenceForPeriod(
  organizationId: string,
  periodId: string
): Promise<ComplianceEvidenceRow[]> {
  return db
    .select()
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        eq(hrmComplianceEvidence.periodId, periodId)
      )
    )
    .orderBy(hrmComplianceEvidence.packType)
}

export async function listComplianceEvidenceForOrg(
  organizationId: string,
  limit = 50
): Promise<ComplianceEvidenceRow[]> {
  return db
    .select()
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        isNotNull(hrmComplianceEvidence.periodId)
      )
    )
    .orderBy(desc(hrmComplianceEvidence.generatedAt))
    .limit(limit)
}

export async function getComplianceEvidence(
  organizationId: string,
  evidenceId: string
): Promise<ComplianceEvidenceRow | null> {
  const [row] = await db
    .select()
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        eq(hrmComplianceEvidence.id, evidenceId)
      )
    )
    .limit(1)

  return row ?? null
}

/**
 * Phase 3J — webhook receiver lookup.
 *
 * Returns the evidence row attached to the given outbound delivery id,
 * scoped to the organization that owns the delivery's endpoint. Used by the
 * bureau-side acknowledgement webhook receiver after signature verification
 * has resolved the trusted `organizationId` from the delivery row itself.
 *
 * Returns `null` when:
 *   - no evidence row links to that delivery (orphan delivery — bureau
 *     replaying a stale id)
 *   - the evidence belongs to a different org (impossible if signature
 *     verification was honest, but defense-in-depth)
 */
export async function findEvidenceByDeliveryId(
  organizationId: string,
  deliveryId: string
): Promise<ComplianceEvidenceRow | null> {
  const [row] = await db
    .select()
    .from(hrmComplianceEvidence)
    .where(
      and(
        eq(hrmComplianceEvidence.organizationId, organizationId),
        eq(hrmComplianceEvidence.submissionDeliveryId, deliveryId)
      )
    )
    .limit(1)

  return row ?? null
}

// ---------------------------------------------------------------------------
// Pre-fetch runs for statutory pack building
// ---------------------------------------------------------------------------

/**
 * Fetches every payroll run for a period (joined to employee identity + period
 * dates) along with its payroll lines, shaped for `buildStatutoryPackFromRuns`.
 *
 * Lines are filtered server-side via `inArray(runId)` so only the relevant
 * subset travels back to the action.
 */
export async function fetchRunsForStatutoryPack(
  organizationId: string,
  periodId: string
): Promise<StatutoryPackRunInput[]> {
  const runs = await db
    .select({
      runId: hrmPayrollRun.id,
      employeeId: hrmPayrollRun.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeName: hrmEmployee.legalName,
      periodId: hrmPayrollRun.periodId,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
      grossPay: hrmPayrollRun.grossPay,
      netPay: hrmPayrollRun.netPay,
    })
    .from(hrmPayrollRun)
    .innerJoin(hrmEmployee, eq(hrmPayrollRun.employeeId, hrmEmployee.id))
    .innerJoin(
      hrmPayrollPeriod,
      eq(hrmPayrollRun.periodId, hrmPayrollPeriod.id)
    )
    .where(
      and(
        eq(hrmPayrollRun.organizationId, organizationId),
        eq(hrmPayrollRun.periodId, periodId)
      )
    )

  if (runs.length === 0) return []

  const runIds = runs.map((r) => r.runId)

  const lines = await db
    .select({
      runId: hrmPayrollLine.runId,
      lineKind: hrmPayrollLine.lineKind,
      code: hrmPayrollLine.code,
      amount: hrmPayrollLine.amount,
      rulePackProvenance: hrmPayrollLine.rulePackProvenance,
    })
    .from(hrmPayrollLine)
    .where(
      and(
        eq(hrmPayrollLine.organizationId, organizationId),
        inArray(hrmPayrollLine.runId, runIds)
      )
    )

  const linesByRun = new Map<string, typeof lines>()
  for (const l of lines) {
    const arr = linesByRun.get(l.runId) ?? []
    arr.push(l)
    linesByRun.set(l.runId, arr)
  }

  return runs.map((r) => ({
    runId: r.runId,
    employeeId: r.employeeId,
    employeeNumber: r.employeeNumber,
    employeeName: r.employeeName,
    periodId: r.periodId,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    grossPay: r.grossPay?.toString() ?? "0.00",
    netPay: r.netPay?.toString() ?? "0.00",
    lines: (linesByRun.get(r.runId) ?? []).map((l) => ({
      lineKind:
        l.lineKind as StatutoryPackRunInput["lines"][number]["lineKind"],
      code: l.code,
      amount: l.amount?.toString() ?? "0.00",
      rulePackProvenance: l.rulePackProvenance as
        | Record<string, string | null>
        | undefined,
    })),
  }))
}
