import "server-only"

import { createHash } from "node:crypto"

import { get as getBlob } from "@vercel/blob"
import { and, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm"
import type { SQL } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmDocument,
  hrmEmployee,
  hrmPayrollPeriod,
  hrmPayrollRun,
} from "#lib/db/schema"
import { logUnexpectedServerError } from "#lib/logger.server"

import {
  payrollPayslipSnapshotFromDocumentPayload,
  stablePayrollCloseStringify,
} from "../../../payroll-compensation/payroll-processing/data/payroll-close.shared"

import {
  canEmployeeAccessDocument,
  deriveEffectiveDocumentVerificationStatus,
  deriveHrmDocumentExpiryState,
  deriveHrmDocumentGroup,
} from "./hrm-document-governance.shared"
import { listActiveDocumentRequirements } from "./hrm-document-governance.server"

import type { HrmDocumentSummary } from "../../../types"
import type { PayrollPayslipSnapshot } from "../../../payroll-compensation/payroll-processing/data/payroll-close.shared"

function mapHrmDocumentSummaryRow(
  row: Omit<HrmDocumentSummary, "isMandatory" | "versionNumber"> & {
    isMandatory: boolean | number
    versionNumber: number | null
  }
): HrmDocumentSummary {
  return {
    ...row,
    isMandatory: Boolean(row.isMandatory),
    versionNumber: row.versionNumber ?? 1,
  }
}

function pushSqlPredicate(predicates: SQL[], predicate: SQL | undefined): void {
  if (predicate) {
    predicates.push(predicate)
  }
}

export async function listHrmDocumentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<HrmDocumentSummary[]> {
  const rows = await db
    .select({
      id: hrmDocument.id,
      documentType: hrmDocument.documentType,
      title: hrmDocument.title,
      blobUrl: hrmDocument.blobUrl,
      payloadHash: hrmDocument.payloadHash,
      mimeType: hrmDocument.mimeType,
      sizeBytes: hrmDocument.sizeBytes,
      classification: hrmDocument.classification,
      verificationStatus: hrmDocument.verificationStatus,
      rejectionReason: hrmDocument.rejectionReason,
      versionNumber: hrmDocument.versionNumber,
      isMandatory: hrmDocument.isMandatory,
      uploadedAt: hrmDocument.uploadedAt,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.employeeId, employeeId),
        eq(hrmDocument.isLatestVersion, true),
        or(
          eq(hrmDocument.documentLifecycleStatus, "active"),
          eq(hrmDocument.documentLifecycleStatus, "archived")
        )
      )
    )
    .orderBy(desc(hrmDocument.uploadedAt))
  return rows.map(mapHrmDocumentSummaryRow)
}

export type EmployeePayslipDocumentSummary = {
  readonly id: string
  readonly title: string
  readonly uploadedAt: Date
  readonly effectiveFrom: Date
  readonly periodEnd: string
  readonly paymentDate: string
  readonly currency: string
  readonly grossPay: string
  readonly netPay: string
  readonly employerCost: string
}

export type EmployeePayslipDocumentDetail = EmployeePayslipDocumentSummary & {
  readonly snapshot: PayrollPayslipSnapshot
}

function hashStablePayload(value: unknown): string {
  return createHash("sha256")
    .update(stablePayrollCloseStringify(value))
    .digest("hex")
}

export async function listPayslipDocumentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<EmployeePayslipDocumentSummary[]> {
  return db
    .select({
      id: hrmDocument.id,
      title: hrmDocument.title,
      uploadedAt: hrmDocument.uploadedAt,
      effectiveFrom: hrmDocument.effectiveFrom,
      periodEnd: hrmPayrollPeriod.periodEnd,
      paymentDate: hrmPayrollPeriod.paymentDate,
      currency: hrmPayrollPeriod.currency,
      grossPay: hrmPayrollRun.grossPay,
      netPay: hrmPayrollRun.netPay,
      employerCost: hrmPayrollRun.employerCost,
    })
    .from(hrmDocument)
    .innerJoin(hrmPayrollRun, eq(hrmDocument.subjectId, hrmPayrollRun.id))
    .innerJoin(
      hrmPayrollPeriod,
      eq(hrmPayrollRun.periodId, hrmPayrollPeriod.id)
    )
    .where(
      and(
        eq(hrmDocument.organizationId, organizationId),
        eq(hrmDocument.employeeId, employeeId),
        eq(hrmDocument.documentType, "payslip"),
        eq(hrmDocument.subjectKind, "payroll_run"),
        eq(hrmDocument.documentLifecycleStatus, "active"),
        eq(hrmPayrollRun.organizationId, organizationId),
        eq(hrmPayrollRun.employeeId, employeeId)
      )
    )
    .orderBy(desc(hrmDocument.effectiveFrom), desc(hrmDocument.uploadedAt))
}

export async function getPayslipDocumentForEmployee(input: {
  organizationId: string
  employeeId: string
  documentId: string
}): Promise<EmployeePayslipDocumentDetail | null> {
  const [document] = await db
    .select({
      id: hrmDocument.id,
      title: hrmDocument.title,
      blobUrl: hrmDocument.blobUrl,
      payloadHash: hrmDocument.payloadHash,
      uploadedAt: hrmDocument.uploadedAt,
      effectiveFrom: hrmDocument.effectiveFrom,
      documentType: hrmDocument.documentType,
      subjectKind: hrmDocument.subjectKind,
      subjectId: hrmDocument.subjectId,
      periodId: hrmPayrollPeriod.id,
      periodEnd: hrmPayrollPeriod.periodEnd,
      paymentDate: hrmPayrollPeriod.paymentDate,
      grossPay: hrmPayrollRun.grossPay,
      netPay: hrmPayrollRun.netPay,
      employerCost: hrmPayrollRun.employerCost,
    })
    .from(hrmDocument)
    .innerJoin(hrmPayrollRun, eq(hrmDocument.subjectId, hrmPayrollRun.id))
    .innerJoin(
      hrmPayrollPeriod,
      eq(hrmPayrollRun.periodId, hrmPayrollPeriod.id)
    )
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        eq(hrmDocument.employeeId, input.employeeId),
        eq(hrmDocument.id, input.documentId),
        eq(hrmDocument.documentType, "payslip"),
        eq(hrmDocument.subjectKind, "payroll_run"),
        eq(hrmDocument.documentLifecycleStatus, "active"),
        eq(hrmPayrollRun.organizationId, input.organizationId),
        eq(hrmPayrollRun.employeeId, input.employeeId)
      )
    )
    .limit(1)

  if (!document || document.documentType !== "payslip") {
    return null
  }

  try {
    const blob = await getBlob(document.blobUrl, {
      access: "private",
      useCache: false,
    })
    if (!blob || blob.statusCode !== 200) {
      return null
    }

    const payloadText = await new Response(blob.stream).text()
    const parsedJson = JSON.parse(payloadText) as unknown
    const expectedHash = hashStablePayload(parsedJson)

    if (expectedHash !== document.payloadHash) {
      logUnexpectedServerError(
        "portal_payslip_hash_mismatch",
        new Error("payslip_payload_hash_mismatch"),
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          documentId: input.documentId,
        }
      )
      return null
    }

    const snapshot = payrollPayslipSnapshotFromDocumentPayload({
      payload: parsedJson,
      payloadHash: document.payloadHash,
    })
    if (!snapshot) {
      logUnexpectedServerError(
        "portal_payslip_payload_invalid",
        new Error("payslip_payload_invalid"),
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          documentId: input.documentId,
        }
      )
      return null
    }

    if (
      snapshot.employeeId !== input.employeeId ||
      snapshot.runId !== document.subjectId ||
      snapshot.periodId !== document.periodId ||
      snapshot.periodEnd !== document.periodEnd ||
      snapshot.paymentDate !== document.paymentDate ||
      snapshot.grossPay !== document.grossPay ||
      snapshot.netPay !== document.netPay ||
      snapshot.employerCost !== document.employerCost
    ) {
      logUnexpectedServerError(
        "portal_payslip_snapshot_mismatch",
        new Error("payslip_snapshot_mismatch"),
        {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
          documentId: input.documentId,
        }
      )
      return null
    }

    return {
      id: document.id,
      title: document.title,
      uploadedAt: document.uploadedAt,
      effectiveFrom: document.effectiveFrom,
      periodEnd: snapshot.periodEnd,
      paymentDate: snapshot.paymentDate,
      currency: snapshot.currency,
      grossPay: snapshot.grossPay,
      netPay: snapshot.netPay,
      employerCost: snapshot.employerCost,
      snapshot,
    }
  } catch (error) {
    logUnexpectedServerError("portal_payslip_read_failed", error, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      documentId: input.documentId,
    })
    return null
  }
}

// ---------------------------------------------------------------------------
// Cross-employee org-scoped queries (PR #3 — HR Documents Vault)
//
// Decorate raw `hrm_document` rows with employee identity columns so the
// vault library renders in two round trips (one read per concern). Mirrors
// the `listRecentAttendanceEventsForOrg` pattern: do not fan out one query
// per row; do not pull the full employee table either. The optional filters
// (`documentType`, `classification`, `employeeId`) are pushed down as Drizzle
// `and(...)` predicates so an index-friendly tenant-scoped scan plays well
// with Postgres planning.
// ---------------------------------------------------------------------------

/**
 * Org-scoped HR document row decorated with employee identity for the
 * documents vault library. `employeeId` may be null (org-wide policy
 * documents allowed by `hrm_document` schema), in which case the
 * identity columns also collapse to `null`.
 */
export type OrgHrmDocumentRow = HrmDocumentSummary & {
  readonly employeeId: string | null
  readonly employeeNumber: string | null
  readonly employeeFullName: string | null
  readonly legalEntityId: string | null
  readonly documentGroup: string | null
  readonly subjectKind: string | null
  readonly subjectId: string | null
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly uploadedByUserId: string | null
  readonly documentSetId: string | null
  readonly previousDocumentId: string | null
  readonly replacedByDocumentId: string | null
  readonly isLatestVersion: boolean
  readonly documentLifecycleStatus: string
  readonly retentionPolicyCode: string | null
  readonly retentionUntil: Date | null
  readonly archivedAt: Date | null
  readonly deletedAt: Date | null
  readonly expiryState: "none" | "valid" | "expiring_soon" | "expired"
  readonly effectiveVerificationStatus: string
}

export type EmployeeVisibleDocumentSummary = Omit<
  HrmDocumentSummary,
  "blobUrl"
> & {
  readonly documentGroup: string | null
  readonly effectiveTo: Date | null
  readonly documentLifecycleStatus: string
  readonly expiryState: "none" | "valid" | "expiring_soon" | "expired"
  readonly effectiveVerificationStatus: string
  readonly canDownload: boolean
}

/** Lightweight identity tuple for the employee filter on the documents vault. */
export type DocumentEmployeeChoiceRow = {
  readonly id: string
  readonly employeeNumber: string
  readonly legalName: string
}

export type ListHrmDocumentsForOrgOptions = {
  readonly limit?: number
  readonly documentType?: string
  readonly documentGroup?: string
  readonly classification?: string
  readonly employeeId?: string
  readonly legalEntityId?: string
  /** HRM-DOC-020: filter by verification lifecycle state. */
  readonly verificationStatus?: string
  readonly documentLifecycleStatus?: string
  readonly expiryStatus?: "expiring_soon" | "expired" | "valid"
  readonly uploadedFrom?: Date
  readonly uploadedTo?: Date
  readonly isMandatory?: boolean
  readonly latestOnly?: boolean
  readonly includeDeleted?: boolean
}

/**
 * Library view of HR documents for one org — newest upload first — with
 * employee identity columns joined where the document is employee-scoped.
 *
 * The row cap is bounded so the vault page payload stays predictable when
 * an org accumulates a large vault (default 100, ceiling 500). Filters
 * narrow the SQL `where` clause; the JS join then decorates only the
 * rows that survived the filter.
 */
export async function listHrmDocumentsForOrg(
  organizationId: string,
  options: ListHrmDocumentsForOrgOptions = {}
): Promise<OrgHrmDocumentRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500)
  const now = new Date()

  const predicates: SQL[] = [eq(hrmDocument.organizationId, organizationId)]
  if (!options.includeDeleted) {
    pushSqlPredicate(
      predicates,
      or(
        isNull(hrmDocument.documentLifecycleStatus),
        eq(hrmDocument.documentLifecycleStatus, "active"),
        eq(hrmDocument.documentLifecycleStatus, "archived")
      )
    )
  }
  if (options.documentType) {
    predicates.push(eq(hrmDocument.documentType, options.documentType))
  }
  if (options.documentGroup) {
    pushSqlPredicate(
      predicates,
      or(
        eq(hrmDocument.documentGroup, options.documentGroup),
        inArray(
          hrmDocument.documentType,
          documentTypesForGroup(options.documentGroup)
        )
      )
    )
  }
  if (options.classification) {
    predicates.push(eq(hrmDocument.classification, options.classification))
  }
  if (options.employeeId) {
    predicates.push(eq(hrmDocument.employeeId, options.employeeId))
  }
  if (options.legalEntityId) {
    predicates.push(eq(hrmDocument.legalEntityId, options.legalEntityId))
  }
  if (options.verificationStatus) {
    predicates.push(eq(hrmDocument.verificationStatus, options.verificationStatus))
  }
  if (options.documentLifecycleStatus) {
    predicates.push(
      eq(hrmDocument.documentLifecycleStatus, options.documentLifecycleStatus)
    )
  }
  if (options.uploadedFrom) {
    predicates.push(gte(hrmDocument.uploadedAt, options.uploadedFrom))
  }
  if (options.uploadedTo) {
    predicates.push(lte(hrmDocument.uploadedAt, options.uploadedTo))
  }
  if (options.isMandatory !== undefined) {
    predicates.push(eq(hrmDocument.isMandatory, options.isMandatory))
  }
  if (options.latestOnly !== false) {
    predicates.push(eq(hrmDocument.isLatestVersion, true))
  }
  if (options.expiryStatus === "expired") {
    predicates.push(lte(hrmDocument.effectiveTo, now))
  } else if (options.expiryStatus === "expiring_soon") {
    const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    predicates.push(gte(hrmDocument.effectiveTo, now))
    predicates.push(lte(hrmDocument.effectiveTo, cutoff))
  } else if (options.expiryStatus === "valid") {
    const cutoff = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    pushSqlPredicate(
      predicates,
      or(isNull(hrmDocument.effectiveTo), gte(hrmDocument.effectiveTo, cutoff))
    )
  }

  const documents = await db
    .select({
      id: hrmDocument.id,
      documentType: hrmDocument.documentType,
      title: hrmDocument.title,
      blobUrl: hrmDocument.blobUrl,
      payloadHash: hrmDocument.payloadHash,
      mimeType: hrmDocument.mimeType,
      sizeBytes: hrmDocument.sizeBytes,
      classification: hrmDocument.classification,
      verificationStatus: hrmDocument.verificationStatus,
      rejectionReason: hrmDocument.rejectionReason,
      versionNumber: hrmDocument.versionNumber,
      isMandatory: hrmDocument.isMandatory,
      uploadedAt: hrmDocument.uploadedAt,
      employeeId: hrmDocument.employeeId,
      legalEntityId: hrmDocument.legalEntityId,
      documentGroup: hrmDocument.documentGroup,
      subjectKind: hrmDocument.subjectKind,
      subjectId: hrmDocument.subjectId,
      effectiveFrom: hrmDocument.effectiveFrom,
      effectiveTo: hrmDocument.effectiveTo,
      uploadedByUserId: hrmDocument.uploadedByUserId,
      documentSetId: hrmDocument.documentSetId,
      previousDocumentId: hrmDocument.previousDocumentId,
      replacedByDocumentId: hrmDocument.replacedByDocumentId,
      isLatestVersion: hrmDocument.isLatestVersion,
      documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
      retentionPolicyCode: hrmDocument.retentionPolicyCode,
      retentionUntil: hrmDocument.retentionUntil,
      archivedAt: hrmDocument.archivedAt,
      deletedAt: hrmDocument.deletedAt,
    })
    .from(hrmDocument)
    .where(and(...predicates))
    .orderBy(desc(hrmDocument.uploadedAt))
    .limit(limit)

  if (documents.length === 0) return []

  const employeeIds = [
    ...new Set(
      documents
        .map((d) => d.employeeId)
        .filter((id): id is string => id !== null)
    ),
  ]

  const employeeMap = new Map<string, { number: string; name: string }>()
  if (employeeIds.length > 0) {
    const employees = await db
      .select({
        id: hrmEmployee.id,
        employeeNumber: hrmEmployee.employeeNumber,
        legalName: hrmEmployee.legalName,
      })
      .from(hrmEmployee)
      .where(
        and(
          eq(hrmEmployee.organizationId, organizationId),
          inArray(hrmEmployee.id, employeeIds)
        )
      )

    for (const e of employees) {
      employeeMap.set(e.id, { number: e.employeeNumber, name: e.legalName })
    }
  }

  return documents.map((d) => {
    const identity = d.employeeId ? employeeMap.get(d.employeeId) : null
    const summary = mapHrmDocumentSummaryRow(d)
    return {
      ...summary,
      employeeId: d.employeeId,
      legalEntityId: d.legalEntityId,
      documentGroup: d.documentGroup,
      subjectKind: d.subjectKind,
      subjectId: d.subjectId,
      effectiveFrom: d.effectiveFrom,
      effectiveTo: d.effectiveTo,
      uploadedByUserId: d.uploadedByUserId,
      documentSetId: d.documentSetId,
      previousDocumentId: d.previousDocumentId,
      replacedByDocumentId: d.replacedByDocumentId,
      isLatestVersion: d.isLatestVersion,
      documentLifecycleStatus: d.documentLifecycleStatus,
      retentionPolicyCode: d.retentionPolicyCode,
      retentionUntil: d.retentionUntil,
      archivedAt: d.archivedAt,
      deletedAt: d.deletedAt,
      expiryState: deriveHrmDocumentExpiryState({
        effectiveTo: d.effectiveTo,
        now,
      }),
      effectiveVerificationStatus: deriveEffectiveDocumentVerificationStatus({
        verificationStatus: d.verificationStatus,
        documentLifecycleStatus: d.documentLifecycleStatus,
        effectiveTo: d.effectiveTo,
        now,
      }),
      employeeNumber: identity?.number ?? null,
      employeeFullName: identity?.name ?? null,
    }
  })
}

function documentTypesForGroup(documentGroup: string): string[] {
  return [
    "offer_letter",
    "contract",
    "appointment_letter",
    "contract_renewal_letter",
    "ic",
    "passport",
    "work_permit",
    "visa",
    "national_id",
    "certification",
    "degree_certificate",
    "professional_license",
    "training_certificate",
    "bank_form",
    "tax_form",
    "statutory_pack",
    "payslip",
    "payroll_declaration",
    "policy_acknowledgement",
    "hr_letter",
    "confirmation_letter",
    "promotion_letter",
    "transfer_letter",
    "warning_letter",
    "disciplinary_letter",
    "medical_cert",
    "fitness_cert",
    "hospitalization_cert",
    "maternity_cert",
    "compliance_form",
    "consent_form",
    "right_to_work",
    "signature_proof",
    "other",
  ].filter((documentType) => deriveHrmDocumentGroup(documentType) === documentGroup)
}

export async function listEmployeeVisibleDocuments(input: {
  organizationId: string
  employeeId: string
  now?: Date
}): Promise<EmployeeVisibleDocumentSummary[]> {
  const now = input.now ?? new Date()
  const rows = await db
    .select({
      id: hrmDocument.id,
      documentType: hrmDocument.documentType,
      title: hrmDocument.title,
      payloadHash: hrmDocument.payloadHash,
      mimeType: hrmDocument.mimeType,
      sizeBytes: hrmDocument.sizeBytes,
      classification: hrmDocument.classification,
      verificationStatus: hrmDocument.verificationStatus,
      rejectionReason: hrmDocument.rejectionReason,
      versionNumber: hrmDocument.versionNumber,
      isMandatory: hrmDocument.isMandatory,
      uploadedAt: hrmDocument.uploadedAt,
      documentGroup: hrmDocument.documentGroup,
      effectiveTo: hrmDocument.effectiveTo,
      documentLifecycleStatus: hrmDocument.documentLifecycleStatus,
    })
    .from(hrmDocument)
    .where(
      and(
        eq(hrmDocument.organizationId, input.organizationId),
        eq(hrmDocument.employeeId, input.employeeId),
        eq(hrmDocument.isLatestVersion, true),
        or(
          eq(hrmDocument.documentLifecycleStatus, "active"),
          eq(hrmDocument.documentLifecycleStatus, "archived")
        )
      )
    )
    .orderBy(desc(hrmDocument.uploadedAt))

  if (rows.length === 0) return []

  const requirements = await listActiveDocumentRequirements({
    organizationId: input.organizationId,
    now,
  })
  const employeeAccessTypes = new Set(
    requirements
      .filter((requirement) => requirement.allowEmployeeAccess)
      .map((requirement) => requirement.documentType)
  )

  return rows
    .filter((row) =>
      canEmployeeAccessDocument({
        classification: row.classification,
        requirementAllowsEmployeeAccess: employeeAccessTypes.has(row.documentType),
      })
    )
    .map((row) => {
      const expiryState = deriveHrmDocumentExpiryState({
        effectiveTo: row.effectiveTo,
        now,
      })
      return {
        id: row.id,
        documentType: row.documentType,
        title: row.title,
        payloadHash: row.payloadHash,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        classification: row.classification,
        verificationStatus: row.verificationStatus,
        rejectionReason: row.rejectionReason,
        versionNumber: row.versionNumber ?? 1,
        isMandatory: Boolean(row.isMandatory),
        uploadedAt: row.uploadedAt,
        documentGroup: row.documentGroup,
        effectiveTo: row.effectiveTo,
        documentLifecycleStatus: row.documentLifecycleStatus,
        expiryState,
        effectiveVerificationStatus: deriveEffectiveDocumentVerificationStatus({
          verificationStatus: row.verificationStatus,
          documentLifecycleStatus: row.documentLifecycleStatus,
          effectiveTo: row.effectiveTo,
          now,
        }),
        canDownload: row.documentLifecycleStatus !== "deleted",
      }
    })
}

/**
 * Active employees scoped to one org for the documents vault employee
 * filter. Excludes archived rows so the picker only surfaces live people;
 * sorted by `employeeNumber` for stable filter ordering across renders.
 */
export async function listEmployeeChoicesForDocumentFilter(
  organizationId: string
): Promise<DocumentEmployeeChoiceRow[]> {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      archivedAt: hrmEmployee.archivedAt,
    })
    .from(hrmEmployee)
    .where(eq(hrmEmployee.organizationId, organizationId))

  return rows
    .filter((r) => r.archivedAt === null)
    .map((r) => ({
      id: r.id,
      employeeNumber: r.employeeNumber,
      legalName: r.legalName,
    }))
    .sort((a, b) => a.employeeNumber.localeCompare(b.employeeNumber))
}
