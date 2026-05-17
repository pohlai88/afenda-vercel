import "server-only"

import { createHash } from "node:crypto"

import { get as getBlob } from "@vercel/blob"
import { and, desc, eq, inArray } from "drizzle-orm"

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

import type { HrmDocumentSummary } from "../../../types"
import type { PayrollPayslipSnapshot } from "../../../payroll-compensation/payroll-processing/data/payroll-close.shared"

function mapHrmDocumentSummaryRow(
  row: Omit<HrmDocumentSummary, "isMandatory"> & { isMandatory: boolean | number }
): HrmDocumentSummary {
  return {
    ...row,
    isMandatory: Boolean(row.isMandatory),
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
        eq(hrmDocument.employeeId, employeeId)
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
  readonly subjectKind: string | null
  readonly subjectId: string | null
  readonly effectiveFrom: Date
  readonly effectiveTo: Date | null
  readonly uploadedByUserId: string | null
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
  readonly classification?: string
  readonly employeeId?: string
  /** HRM-DOC-020: filter by verification lifecycle state. */
  readonly verificationStatus?: string
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

  const predicates = [eq(hrmDocument.organizationId, organizationId)]
  if (options.documentType) {
    predicates.push(eq(hrmDocument.documentType, options.documentType))
  }
  if (options.classification) {
    predicates.push(eq(hrmDocument.classification, options.classification))
  }
  if (options.employeeId) {
    predicates.push(eq(hrmDocument.employeeId, options.employeeId))
  }
  if (options.verificationStatus) {
    predicates.push(eq(hrmDocument.verificationStatus, options.verificationStatus))
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
      subjectKind: hrmDocument.subjectKind,
      subjectId: hrmDocument.subjectId,
      effectiveFrom: hrmDocument.effectiveFrom,
      effectiveTo: hrmDocument.effectiveTo,
      uploadedByUserId: hrmDocument.uploadedByUserId,
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
      subjectKind: d.subjectKind,
      subjectId: d.subjectId,
      effectiveFrom: d.effectiveFrom,
      effectiveTo: d.effectiveTo,
      uploadedByUserId: d.uploadedByUserId,
      employeeNumber: identity?.number ?? null,
      employeeFullName: identity?.name ?? null,
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
