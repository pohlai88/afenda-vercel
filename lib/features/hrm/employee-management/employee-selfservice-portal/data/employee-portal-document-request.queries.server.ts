import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEssDocumentRequest } from "#lib/db/schema"

export type EssDocumentRequestRow = {
  readonly id: string
  readonly employeeId: string
  readonly title: string
  readonly notes: string | null
  readonly status: string
  readonly reviewNote: string | null
  readonly reviewedByUserId: string | null
  readonly reviewedAt: Date | null
  readonly submittedByUserId: string
  readonly submittedAt: Date
  readonly fulfilledDocumentId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

const DOCUMENT_REQUEST_COLUMNS = {
  id: hrmEssDocumentRequest.id,
  employeeId: hrmEssDocumentRequest.employeeId,
  title: hrmEssDocumentRequest.title,
  notes: hrmEssDocumentRequest.notes,
  status: hrmEssDocumentRequest.status,
  reviewNote: hrmEssDocumentRequest.reviewNote,
  reviewedByUserId: hrmEssDocumentRequest.reviewedByUserId,
  reviewedAt: hrmEssDocumentRequest.reviewedAt,
  submittedByUserId: hrmEssDocumentRequest.submittedByUserId,
  submittedAt: hrmEssDocumentRequest.submittedAt,
  fulfilledDocumentId: hrmEssDocumentRequest.fulfilledDocumentId,
  createdAt: hrmEssDocumentRequest.createdAt,
  updatedAt: hrmEssDocumentRequest.updatedAt,
} as const

export async function listEmployeeDocumentRequests(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
}): Promise<EssDocumentRequestRow[]> {
  return db
    .select(DOCUMENT_REQUEST_COLUMNS)
    .from(hrmEssDocumentRequest)
    .where(
      and(
        eq(hrmEssDocumentRequest.organizationId, input.organizationId),
        eq(hrmEssDocumentRequest.employeeId, input.employeeId)
      )
    )
    .orderBy(desc(hrmEssDocumentRequest.createdAt))
    .limit(input.limit ?? 50)
}

export async function listPendingDocumentRequestsForOrg(input: {
  readonly organizationId: string
  readonly limit?: number
}): Promise<EssDocumentRequestRow[]> {
  return db
    .select(DOCUMENT_REQUEST_COLUMNS)
    .from(hrmEssDocumentRequest)
    .where(
      and(
        eq(hrmEssDocumentRequest.organizationId, input.organizationId),
        eq(hrmEssDocumentRequest.status, "pending")
      )
    )
    .orderBy(desc(hrmEssDocumentRequest.createdAt))
    .limit(input.limit ?? 100)
}
