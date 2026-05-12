import "server-only"

import { and, desc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmDocument, hrmEmployee } from "#lib/db/schema"

import type { HrmDocumentSummary } from "../types"

export async function listHrmDocumentsForEmployee(
  organizationId: string,
  employeeId: string
): Promise<HrmDocumentSummary[]> {
  return db
    .select({
      id: hrmDocument.id,
      documentType: hrmDocument.documentType,
      title: hrmDocument.title,
      blobUrl: hrmDocument.blobUrl,
      payloadHash: hrmDocument.payloadHash,
      mimeType: hrmDocument.mimeType,
      sizeBytes: hrmDocument.sizeBytes,
      classification: hrmDocument.classification,
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
    return {
      ...d,
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
