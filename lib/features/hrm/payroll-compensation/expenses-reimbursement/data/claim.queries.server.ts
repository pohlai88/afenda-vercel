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

import { and, asc, desc, eq, gte, inArray, isNull, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApproval,
  hrmClaim,
  hrmClaimEvidence,
  hrmClaimType,
  hrmDocument,
  hrmEmployee,
} from "#lib/db/schema"
import {
  canUseErpPermission,
  listUserIdsWithErpPermission,
} from "#features/erp-rbac/server"

import {
  claimPolicySnapshotFromUnknown,
  type ClaimEvidenceType,
  type ClaimStateValue,
} from "./claim-helpers.shared"

const CLAIM_LIST_LIMIT_MAX = 100

function normalizeClaimListLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? 0) || !limit) return 50
  return Math.min(Math.max(Math.trunc(limit), 1), CLAIM_LIST_LIMIT_MAX)
}

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
  readonly periodLimit: string | null
  readonly annualLimit: string | null
  readonly evidenceRequiredAboveAmount: string | null
  readonly requiresEvidence: boolean
  readonly defaultPayoutMethod: string
  readonly defaultFinanceAccountCode: string | null
  readonly defaultCostCenterCode: string | null
  readonly defaultTaxTreatment: string
  readonly isActive: boolean
}

export type ClaimRow = {
  readonly id: string
  readonly claimNumber: string | null
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
  readonly submittedByUserId: string | null
  readonly currentApprovalId: string | null
  readonly decidedByUserId: string | null
  readonly decidedAt: Date | null
  readonly rejectedReason: string | null
  readonly paidByPayrollLineId: string | null
  readonly paidAt: Date | null
  readonly cancelledAt: Date | null
  readonly evidenceCount: number
  readonly requiresEvidence: boolean
  readonly policyEvidenceRequired: boolean | null
  readonly payoutMethod: string
  readonly financeAccountCode: string | null
  readonly costCenterCode: string | null
  readonly projectCode: string | null
  readonly taxTreatment: string
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
      periodLimit: hrmClaimType.periodLimit,
      annualLimit: hrmClaimType.annualLimit,
      evidenceRequiredAboveAmount: hrmClaimType.evidenceRequiredAboveAmount,
      requiresEvidence: hrmClaimType.requiresEvidence,
      defaultPayoutMethod: hrmClaimType.defaultPayoutMethod,
      defaultFinanceAccountCode: hrmClaimType.defaultFinanceAccountCode,
      defaultCostCenterCode: hrmClaimType.defaultCostCenterCode,
      defaultTaxTreatment: hrmClaimType.defaultTaxTreatment,
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
      periodLimit: true,
      annualLimit: true,
      evidenceRequiredAboveAmount: true,
      requiresEvidence: true,
      defaultPayoutMethod: true,
      defaultFinanceAccountCode: true,
      defaultCostCenterCode: true,
      defaultTaxTreatment: true,
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
  filter: {
    ids?: readonly string[]
    states?: readonly ClaimStateValue[]
    employeeId?: string
    claimDateFrom?: string
    claimDateTo?: string
    exceptionPendingOnly?: boolean
    limit?: number
  }
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
  const claimDateFromPred = filter.claimDateFrom
    ? gte(hrmClaim.claimDate, filter.claimDateFrom)
    : undefined
  const claimDateToPred = filter.claimDateTo
    ? lte(hrmClaim.claimDate, filter.claimDateTo)
    : undefined
  const exceptionPendingPred = filter.exceptionPendingOnly
    ? and(
        eq(hrmClaim.requiresExceptionApproval, true),
        isNull(hrmClaim.exceptionApprovedAt)
      )
    : undefined

  const where = [
    orgPredicate,
    idPred,
    statePred,
    employeePred,
    claimDateFromPred,
    claimDateToPred,
    exceptionPendingPred,
  ].filter((clause): clause is Exclude<typeof clause, undefined> =>
    Boolean(clause)
  )

  const rows = await db
    .select({
      id: hrmClaim.id,
      claimNumber: hrmClaim.claimNumber,
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
      submittedByUserId: hrmClaim.submittedByUserId,
      currentApprovalId: hrmClaim.currentApprovalId,
      decidedByUserId: hrmClaim.decidedByUserId,
      decidedAt: hrmClaim.decidedAt,
      rejectedReason: hrmClaim.rejectedReason,
      paidByPayrollLineId: hrmClaim.paidByPayrollLineId,
      paidAt: hrmClaim.paidAt,
      cancelledAt: hrmClaim.cancelledAt,
      requiresEvidence: hrmClaimType.requiresEvidence,
      policySnapshot: hrmClaim.policySnapshot,
      payoutMethod: hrmClaim.payoutMethod,
      financeAccountCode: hrmClaim.financeAccountCode,
      costCenterCode: hrmClaim.costCenterCode,
      projectCode: hrmClaim.projectCode,
      taxTreatment: hrmClaim.taxTreatment,
      createdAt: hrmClaim.createdAt,
      updatedAt: hrmClaim.updatedAt,
    })
    .from(hrmClaim)
    .leftJoin(hrmEmployee, eq(hrmEmployee.id, hrmClaim.employeeId))
    .leftJoin(hrmClaimType, eq(hrmClaimType.id, hrmClaim.claimTypeId))
    .where(and(...where))
    .orderBy(desc(hrmClaim.createdAt))
    .limit(normalizeClaimListLimit(filter.limit))

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

  return rows.map((row) => {
    const policySnapshot = claimPolicySnapshotFromUnknown(row.policySnapshot)

    return {
      ...row,
      state: row.state as ClaimStateValue,
      claimTypeCode: row.claimTypeCode ?? "",
      claimTypeName: row.claimTypeName ?? "",
      requiresEvidence: row.requiresEvidence ?? false,
      policyEvidenceRequired: policySnapshot?.evidenceRequired ?? null,
      evidenceCount: countByClaim.get(row.id) ?? 0,
    }
  })
}

// ---------------------------------------------------------------------------
// Claim list / detail
// ---------------------------------------------------------------------------

export async function listClaimsForOrg(
  organizationId: string,
  options: {
    states?: readonly ClaimStateValue[]
    employeeId?: string
    limit?: number
  } = {}
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, options)
}

export async function listClaimsForOrgPage(
  organizationId: string,
  options: {
    states?: readonly ClaimStateValue[]
    employeeId?: string
    limit?: number
  } = {}
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, options)
}

export async function listClaimsForEmployee(
  organizationId: string,
  employeeId: string,
  options: { limit?: number } = {}
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, { employeeId, limit: options.limit })
}

export async function listClaimsForCurrentEmployee(
  organizationId: string,
  userId: string,
  options: { limit?: number } = {}
): Promise<ReadonlyArray<ClaimRow>> {
  const employee = await findClaimEmployeeForUser(organizationId, userId)
  if (!employee) return []
  return listClaimsForEmployee(organizationId, employee.id, options)
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

/** Claims awaiting policy exception approval (submitted, exception not yet granted). */
export async function listExceptionPendingClaimsForOrg(
  organizationId: string
): Promise<ReadonlyArray<ClaimRow>> {
  return fetchClaimsBase(organizationId, {
    states: ["submitted"],
    exceptionPendingOnly: true,
  })
}

export async function listPendingClaimApprovalsForActor(
  organizationId: string,
  userId: string
): Promise<ReadonlyArray<ClaimRow>> {
  const approvals = await db
    .select({ subjectId: hrmApproval.subjectId })
    .from(hrmApproval)
    .where(
      and(
        eq(hrmApproval.organizationId, organizationId),
        eq(hrmApproval.subjectKind, "claim"),
        eq(hrmApproval.state, "pending"),
        eq(hrmApproval.currentApproverUserId, userId)
      )
    )

  if (approvals.length === 0) return []

  return fetchClaimsBase(organizationId, {
    ids: approvals.map((approval) => approval.subjectId),
    states: ["submitted"],
  })
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
      claimNumber: hrmClaim.claimNumber,
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
      submittedByUserId: hrmClaim.submittedByUserId,
      currentApprovalId: hrmClaim.currentApprovalId,
      decidedByUserId: hrmClaim.decidedByUserId,
      decidedAt: hrmClaim.decidedAt,
      rejectedReason: hrmClaim.rejectedReason,
      paidByPayrollLineId: hrmClaim.paidByPayrollLineId,
      paidAt: hrmClaim.paidAt,
      cancelledAt: hrmClaim.cancelledAt,
      requiresEvidence: hrmClaimType.requiresEvidence,
      payoutMethod: hrmClaim.payoutMethod,
      financeAccountCode: hrmClaim.financeAccountCode,
      costCenterCode: hrmClaim.costCenterCode,
      projectCode: hrmClaim.projectCode,
      taxTreatment: hrmClaim.taxTreatment,
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
        eq(hrmClaim.payoutMethod, "payroll"),
        isNull(hrmClaim.paidByPayrollLineId),
        gte(hrmClaim.claimDate, periodStart),
        lte(hrmClaim.claimDate, periodEnd)
      )
    )
    .orderBy(asc(hrmClaim.claimDate))

  return rows.map((row) => ({
    ...row,
    state: row.state as ClaimStateValue,
    claimTypeCode: row.claimTypeCode ?? "",
    claimTypeName: row.claimTypeName ?? "",
    requiresEvidence: row.requiresEvidence ?? false,
    policyEvidenceRequired: null,
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

export async function isClaimAssignedApprover(input: {
  organizationId: string
  userId: string
  currentApprovalId: string | null
}): Promise<boolean> {
  if (!input.currentApprovalId) return false

  const approval = await db.query.hrmApproval.findFirst({
    where: and(
      eq(hrmApproval.organizationId, input.organizationId),
      eq(hrmApproval.id, input.currentApprovalId),
      eq(hrmApproval.subjectKind, "claim")
    ),
    columns: {
      state: true,
      currentApproverUserId: true,
    },
  })

  return (
    approval?.state === "pending" &&
    approval.currentApproverUserId === input.userId
  )
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
  linkedUserId: string | null
  managerEmployeeId: string | null
  archivedAt: Date | null
  employmentStatus: string | null
  countryCode: string | null
  currentDepartmentId: string | null
  currentJobGradeId: string | null
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
      linkedUserId: true,
      managerEmployeeId: true,
      archivedAt: true,
      employmentStatus: true,
      countryCode: true,
      currentDepartmentId: true,
      currentJobGradeId: true,
    },
  })
  return row ?? null
}

export async function findClaimEmployeeForUser(
  organizationId: string,
  userId: string
): Promise<{
  id: string
  employeeNumber: string
  legalName: string
  linkedUserId: string | null
  managerEmployeeId: string | null
  archivedAt: Date | null
} | null> {
  const row = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, organizationId),
      eq(hrmEmployee.linkedUserId, userId),
      isNull(hrmEmployee.archivedAt)
    ),
    columns: {
      id: true,
      employeeNumber: true,
      legalName: true,
      linkedUserId: true,
      managerEmployeeId: true,
      archivedAt: true,
    },
  })
  return row ?? null
}

export async function resolveClaimApproverUserId(input: {
  organizationId: string
  managerEmployeeId: string | null
}): Promise<string | null> {
  if (input.managerEmployeeId) {
    const manager = await db.query.hrmEmployee.findFirst({
      where: and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.managerEmployeeId),
        isNull(hrmEmployee.archivedAt)
      ),
      columns: { linkedUserId: true },
    })
    if (manager?.linkedUserId) return manager.linkedUserId
  }

  const [fallbackApproverUserId] = await listUserIdsWithErpPermission({
    organizationId: input.organizationId,
    permission: { module: "hrm", object: "claim", function: "update" },
  })

  return fallbackApproverUserId ?? null
}

export async function sumClaimsForEmployeeClaimTypeWindow(input: {
  organizationId: string
  employeeId: string
  claimTypeId: string
  claimDateFrom: string
  claimDateTo: string
}): Promise<number> {
  const rows = await db
    .select({ amount: hrmClaim.amount })
    .from(hrmClaim)
    .where(
      and(
        eq(hrmClaim.organizationId, input.organizationId),
        eq(hrmClaim.employeeId, input.employeeId),
        eq(hrmClaim.claimTypeId, input.claimTypeId),
        inArray(hrmClaim.state, ["submitted", "approved", "paid"]),
        gte(hrmClaim.claimDate, input.claimDateFrom),
        lte(hrmClaim.claimDate, input.claimDateTo)
      )
    )

  return rows.reduce((total, row) => total + Number(row.amount), 0)
}

export async function canUploadClaimEvidenceForUser(input: {
  organizationId: string
  userId: string
  employeeId: string
  claimId: string
}): Promise<boolean> {
  const claim = await db.query.hrmClaim.findFirst({
    where: and(
      eq(hrmClaim.organizationId, input.organizationId),
      eq(hrmClaim.id, input.claimId),
      eq(hrmClaim.employeeId, input.employeeId)
    ),
    columns: { state: true },
  })
  if (
    !claim ||
    claim.state === "paid" ||
    claim.state === "rejected" ||
    claim.state === "cancelled"
  ) {
    return false
  }

  const employee = await db.query.hrmEmployee.findFirst({
    where: and(
      eq(hrmEmployee.organizationId, input.organizationId),
      eq(hrmEmployee.id, input.employeeId)
    ),
    columns: { linkedUserId: true },
  })
  if (employee?.linkedUserId === input.userId) return true

  return canUseErpPermission({
    organizationId: input.organizationId,
    userId: input.userId,
    permission: { module: "hrm", object: "claim", function: "update" },
  })
}
