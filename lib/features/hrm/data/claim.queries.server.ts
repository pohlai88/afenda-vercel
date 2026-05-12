/**
 * Claim queries — Phase 4.
 *
 * Org-scoped reads for the claims kanban (`/dashboard/hrm/claims`), the
 * per-claim drill-down (`/dashboard/hrm/claims/[claimId]`), the admin
 * inbox, the HR Nexus pressure aggregator, and the payroll-finalize
 * workflow's "approved unpaid claims" question.
 *
 * Every read is `where(organizationId)` — the layout's `requireOrgSession`
 * supplies the trusted id, never `formData`.
 */
import "server-only"

import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmClaim,
  hrmClaimEvidence,
  hrmClaimType,
  hrmDocument,
  hrmEmployee,
} from "#lib/db/schema"

import type { ClaimEvidenceType, ClaimStateValue } from "./claim-helpers.shared"

// ---------------------------------------------------------------------------
// Row shapes (serializable — safe to pass into Server / Client Components).
// ---------------------------------------------------------------------------

export type ClaimTypeRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly description: string | null
  readonly defaultPayrollLineCode: string
  readonly currency: string
  readonly perClaimLimit: string | null
  readonly requiresEvidence: boolean
  readonly isActive: boolean
}

export type ClaimRow = {
  readonly id: string
  readonly employeeId: string
  readonly employeeNumber: string | null
  readonly employeeFullName: string | null
  readonly claimTypeId: string
  readonly claimTypeCode: string
  readonly claimTypeName: string
  readonly claimDate: string
  readonly amount: string
  readonly currency: string
  readonly description: string | null
  readonly state: ClaimStateValue
  readonly submittedAt: Date | null
  readonly currentApprovalId: string | null
  readonly decidedByUserId: string | null
  readonly decidedAt: Date | null
  readonly rejectedReason: string | null
  readonly paidByPayrollLineId: string | null
  readonly paidAt: Date | null
  readonly cancelledAt: Date | null
  readonly evidenceCount: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type ClaimEvidenceRow = {
  readonly id: string
  readonly claimId: string
  readonly documentId: string
  readonly documentTitle: string
  readonly documentBlobUrl: string
  readonly documentPayloadHash: string
  readonly documentMimeType: string
  readonly documentSizeBytes: number
  readonly evidenceType: ClaimEvidenceType
  readonly notes: string | null
  readonly uploadedAt: Date
}

export type ClaimDetailRow = {
  readonly claim: ClaimRow
  readonly evidence: ReadonlyArray<ClaimEvidenceRow>
}

// ---------------------------------------------------------------------------
// Claim type catalog
// ---------------------------------------------------------------------------

export async function listClaimTypesForOrg(
  organizationId: string,
  options: { activeOnly?: boolean } = {}
): Promise<ReadonlyArray<ClaimTypeRow>> {
  const where = options.activeOnly
    ? and(
        eq(hrmClaimType.organizationId, organizationId),
        eq(hrmClaimType.isActive, true)
      )
    : eq(hrmClaimType.organizationId, organizationId)

  const rows = await db
    .select({
      id: hrmClaimType.id,
      code: hrmClaimType.code,
      name: hrmClaimType.name,
      description: hrmClaimType.description,
      defaultPayrollLineCode: hrmClaimType.defaultPayrollLineCode,
      currency: hrmClaimType.currency,
      perClaimLimit: hrmClaimType.perClaimLimit,
      requiresEvidence: hrmClaimType.requiresEvidence,
      isActive: hrmClaimType.isActive,
    })
    .from(hrmClaimType)
    .where(where)
    .orderBy(asc(hrmClaimType.code))

  return rows
}

export async function getClaimTypeForOrg(
  organizationId: string,
  claimTypeId: string
): Promise<ClaimTypeRow | null> {
  const row = await db.query.hrmClaimType.findFirst({
    where: and(
      eq(hrmClaimType.id, claimTypeId),
      eq(hrmClaimType.organizationId, organizationId)
    ),
    columns: {
      id: true,
      code: true,
      name: true,
      description: true,
      defaultPayrollLineCode: true,
      currency: true,
      perClaimLimit: true,
      requiresEvidence: true,
      isActive: true,
    },
  })
  return row ?? null
}

// ---------------------------------------------------------------------------
// Internal helper — base join used by all claim list/get queries.
// ---------------------------------------------------------------------------

async function fetchClaimsBase(
  organizationId: string,
  filter: { ids?: readonly string[]; states?: readonly ClaimStateValue[]; employeeId?: string }
): Promise<ClaimRow[]> {
  const orgPredicate = eq(hrmClaim.organizationId, organizationId)
  const idPred =
    filter.ids && filter.ids.length > 0
      ? inArray(hrmClaim.id, [...filter.ids])
      : undefined
  const statePred =
    filter.states && filter.states.length > 0
      ? inArray(hrmClaim.state, [...filter.states])
      : undefined
  const employeePred = filter.employeeId
    ? eq(hrmClaim.employeeId, filter.employeeId)
    : undefined

  const where = [orgPredicate, idPred, statePred, employeePred].filter(
    (clause): clause is Exclude<typeof clause, undefined> => Boolean(clause)
  )

  const rows = await db
    .select({
      id: hrmClaim.id,
      employeeId: hrmClaim.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeFullName: hrmEmployee.legalName,
      claimTypeId: hrmClaim.claimTypeId,
      claimTypeCode: hrmClaimType.code,
      claimTypeName: hrmClaimType.name,
      claimDate: hrmClaim.claimDate,
      amount: hrmClaim.amount,
      currency: hrmClaim.currency,
      description: hrmClaim.description,
      state: hrmClaim.state,
      submittedAt: hrmClaim.submittedAt,
      currentApprovalId: hrmClaim.currentApprovalId,
      decidedByUserId: hrmClaim.decidedByUserId,
      decidedAt: hrmClaim.decidedAt,
      rejectedReason: hrmClaim.rejectedReason,
      paidByPayrollLineId: hrmClaim.paidByPayrollLineId,
      paidAt: hrmClaim.paidAt,
      cancelledAt: hrmClaim.cancelledAt,
      createdAt: hrmClaim.createdAt,
      updatedAt: hrmClaim.updatedAt,
    })
    .from(hrmClaim)
    .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmClaim.employeeId))
    .leftJoin(hrmClaimType, eq(hrmClaimType.id, hrmClaim.claimTypeId))
    .where(and(...where))
    .orderBy(desc(hrmClaim.createdAt))

  if (rows.length === 0) return []

  const evidenceCounts = await db
    .select({
      claimId: hrmClaimEvidence.claimId,
    })
    .from(hrmClaimEvidence)
    .where(
      and(
        eq(hrmClaimEvidence.organizationId, organizationId),
        inArray(
          hrmClaimEvidence.claimId,
          rows.map((r) => r.id)
        )
      )
    )

  const countByClaim = new Map<string, number>()
  for (const row of evidenceCounts) {
    countByClaim.set(row.claimId, (countByClaim.get(row.claimId) ?? 0) + 1)
  }

  return rows.map((row) => ({
    ...row,
    state: row.state as ClaimStateValue,
    claimTypeCode: row.claimTypeCode ?? "",
    claimTypeName: row.claimTypeName ?? "",
    evidenceCount: countByClaim.get(row.id) ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// Claim list / detail
// ---------------------------------------------------------------------------

export async function listClaimsForOrg(
  organizationId: string,
  options: { states?: readonly ClaimStateValue[]; employeeId?: string } = {}
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, options)
}

export async function listClaimsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, { employeeId })
}

export async function getClaimDetail(
  organizationId: string,
  claimId: string
): Promise<ClaimDetailRow | null> {
  const [claim] = await fetchClaimsBase(organizationId, { ids: [claimId] })
  if (!claim) return null

  const evidence = await db
    .select({
      id: hrmClaimEvidence.id,
      claimId: hrmClaimEvidence.claimId,
      documentId: hrmClaimEvidence.documentId,
      documentTitle: hrmDocument.title,
      documentBlobUrl: hrmDocument.blobUrl,
      documentPayloadHash: hrmDocument.payloadHash,
      documentMimeType: hrmDocument.mimeType,
      documentSizeBytes: hrmDocument.sizeBytes,
      evidenceType: hrmClaimEvidence.evidenceType,
      notes: hrmClaimEvidence.notes,
      uploadedAt: hrmClaimEvidence.uploadedAt,
    })
    .from(hrmClaimEvidence)
    .leftJoin(hrmDocument, eq(hrmDocument.id, hrmClaimEvidence.documentId))
    .where(
      and(
        eq(hrmClaimEvidence.organizationId, organizationId),
        eq(hrmClaimEvidence.claimId, claimId)
      )
    )
    .orderBy(asc(hrmClaimEvidence.uploadedAt))

  return {
    claim,
    evidence: evidence.map((row) => ({
      ...row,
      documentTitle: row.documentTitle ?? "",
      documentBlobUrl: row.documentBlobUrl ?? "",
      documentPayloadHash: row.documentPayloadHash ?? "",
      documentMimeType: row.documentMimeType ?? "",
      documentSizeBytes: row.documentSizeBytes ?? 0,
      evidenceType: row.evidenceType as ClaimEvidenceType,
    })),
  }
}

// ---------------------------------------------------------------------------
// Operational reads — admin inbox + payroll question 8 + Nexus pressure
// ---------------------------------------------------------------------------

/** Pending approval inbox for the admin claims drawer. */
export async function listPendingClaimApprovalsForOrg(
  organizationId: string
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, { states: ["submitted"] })
}

/**
 * Approved-but-not-yet-paid claims whose `claimDate` falls within
 * `[periodStart, periodEnd]`. Consumed by `payroll-finalize.workflow.ts`
 * (PR 5) — drives the bridge from claim → `hrm_payroll_line.claimId`.
 *
 * Uses a single org-scoped read; payroll guards still re-check the runId
 * before writing a payroll line so this query is purely read-only.
 */
export async function listApprovedUnpaidClaimsForPeriod(
  organizationId: string,
  periodStart: string,
  periodEnd: string
): Promise<ReadonlyArray<ClaimRow>> {
  const rows = await db
    .select({
      id: hrmClaim.id,
      employeeId: hrmClaim.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeFullName: hrmEmployee.legalName,
      claimTypeId: hrmClaim.claimTypeId,
      claimTypeCode: hrmClaimType.code,
      claimTypeName: hrmClaimType.name,
      claimDate: hrmClaim.claimDate,
      amount: hrmClaim.amount,
      currency: hrmClaim.currency,
      description: hrmClaim.description,
      state: hrmClaim.state,
      submittedAt: hrmClaim.submittedAt,
      currentApprovalId: hrmClaim.currentApprovalId,
      decidedByUserId: hrmClaim.decidedByUserId,
      decidedAt: hrmClaim.decidedAt,
      rejectedReason: hrmClaim.rejectedReason,
      paidByPayrollLineId: hrmClaim.paidByPayrollLineId,
      paidAt: hrmClaim.paidAt,
      cancelledAt: hrmClaim.cancelledAt,
      createdAt: hrmClaim.createdAt,
      updatedAt: hrmClaim.updatedAt,
    })
    .from(hrmClaim)
    .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmClaim.employeeId))
    .leftJoin(hrmClaimType, eq(hrmClaimType.id, hrmClaim.claimTypeId))
    .where(
      and(
        eq(hrmClaim.organizationId, organizationId),
        eq(hrmClaim.state, "approved"),
        gte(hrmClaim.claimDate, periodStart),
        lte(hrmClaim.claimDate, periodEnd)
      )
    )
    .orderBy(asc(hrmClaim.claimDate))

  return rows
    .filter((row) => row.paidByPayrollLineId == null)
    .map((row) => ({
      ...row,
      state: row.state as ClaimStateValue,
      claimTypeCode: row.claimTypeCode ?? "",
      claimTypeName: row.claimTypeName ?? "",
      evidenceCount: 0,
    }))
}

/**
 * Counts pending claim approvals for the HR Nexus pressure aggregator.
 * Cheap aggregate read — no joins; safe to call in parallel with other
 * pressure queries.
 */
export async function countPendingClaimsForOrg(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({ id: hrmClaim.id })
    .from(hrmClaim)
    .where(
      and(
        eq(hrmClaim.organizationId, organizationId),
        eq(hrmClaim.state, "submitted")
      )
    )
  return rows.length
}

/** Counts approved-unpaid claims for the HR Nexus pressure aggregator. */
export async function countApprovedUnpaidClaimsForOrg(
  organizationId: string
): Promise<number> {
  const rows = await db
    .select({
      id: hrmClaim.id,
      paidByPayrollLineId: hrmClaim.paidByPayrollLineId,
    })
    .from(hrmClaim)
    .where(
      and(
        eq(hrmClaim.organizationId, organizationId),
        eq(hrmClaim.state, "approved")
      )
    )
  return rows.filter((row) => row.paidByPayrollLineId == null).length
}

// ---------------------------------------------------------------------------
// hrm_approval ↔ claim lookup (used by approve / reject Server Actions)
// ---------------------------------------------------------------------------

export async function findClaimApproval(
  organizationId: string,
  approvalId: string
): Promise<{
  id: string
  state: string
  subjectKind: string
  subjectId: string
} | null> {
  const row = await db.query.hrmApproval.findFirst({
    where: and(
      eq(hrmApproval.id, approvalId),
      eq(hrmApproval.organizationId, organizationId),
      eq(hrmApproval.subjectKind, "claim")
    ),
    columns: { id: true, state: true, subjectKind: true, subjectId: true },
  })
  return row ?? null
}

// ---------------------------------------------------------------------------
// Existence helpers (used by submit + attach-evidence Server Actions)
// ---------------------------------------------------------------------------

export type ClaimDocumentLite = {
  id: string
  organizationId: string
  employeeId: string | null
}

export async function findOrgDocumentForClaim(
  organizationId: string,
  documentId: string
): Promise<ClaimDocumentLite | null> {
  const row = await db.query.hrmDocument.findFirst({
    where: and(
      eq(hrmDocument.id, documentId),
      eq(hrmDocument.organizationId, organizationId)
    ),
    columns: { id: true, organizationId: true, employeeId: true },
  })
  return row ?? null
}

export async function findOrgEmployeeForClaim(
  organizationId: string,
  employeeId: string
): Promise<{
  id: string
  employeeNumber: string
  legalName: string
  archivedAt: Date | null
} | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.id, employeeId),
      eq(hrmEmployee.organizationId, organizationId)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      archivedAt: true,
    },
  })
  return row ?? null
}
