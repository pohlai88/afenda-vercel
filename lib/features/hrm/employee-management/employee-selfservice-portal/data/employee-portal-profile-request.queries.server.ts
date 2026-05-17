import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEssProfileUpdateRequest } from "#lib/db/schema"

/**
 * Projection returned by the pending-request queue.
 * Used by both the employee (view own requests) and HR (review queue).
 * HRM-ESS-004/018/023.
 */
export type EssProfileUpdateRequestRow = {
  readonly id: string
  readonly employeeId: string
  readonly section: string
  /** Parsed requested changes object. */
  readonly requestedChanges: Record<string, unknown>
  readonly status: string
  readonly reviewNote: string | null
  readonly reviewedByUserId: string | null
  readonly reviewedAt: Date | null
  readonly submittedByUserId: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

function parseRequestedChanges(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  return {}
}

/**
 * Returns the employee's own profile update requests for the portal tracker.
 * HRM-ESS-018.
 */
export async function listEmployeeProfileUpdateRequests(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly limit?: number
}): Promise<EssProfileUpdateRequestRow[]> {
  const rows = await db
    .select({
      id: hrmEssProfileUpdateRequest.id,
      employeeId: hrmEssProfileUpdateRequest.employeeId,
      section: hrmEssProfileUpdateRequest.section,
      requestedChanges: hrmEssProfileUpdateRequest.requestedChanges,
      status: hrmEssProfileUpdateRequest.status,
      reviewNote: hrmEssProfileUpdateRequest.reviewNote,
      reviewedByUserId: hrmEssProfileUpdateRequest.reviewedByUserId,
      reviewedAt: hrmEssProfileUpdateRequest.reviewedAt,
      submittedByUserId: hrmEssProfileUpdateRequest.submittedByUserId,
      createdAt: hrmEssProfileUpdateRequest.createdAt,
      updatedAt: hrmEssProfileUpdateRequest.updatedAt,
    })
    .from(hrmEssProfileUpdateRequest)
    .where(
      and(
        eq(hrmEssProfileUpdateRequest.organizationId, input.organizationId),
        eq(hrmEssProfileUpdateRequest.employeeId, input.employeeId)
      )
    )
    .orderBy(desc(hrmEssProfileUpdateRequest.createdAt))
    .limit(input.limit ?? 50)

  return rows.map((row) => ({
    ...row,
    requestedChanges: parseRequestedChanges(row.requestedChanges),
  }))
}

/**
 * Returns all PENDING profile update requests across the organization.
 * Used in the HR admin review queue. HRM-ESS-004.
 */
export async function listPendingProfileUpdateRequestsForOrg(input: {
  readonly organizationId: string
  readonly limit?: number
}): Promise<EssProfileUpdateRequestRow[]> {
  const rows = await db
    .select({
      id: hrmEssProfileUpdateRequest.id,
      employeeId: hrmEssProfileUpdateRequest.employeeId,
      section: hrmEssProfileUpdateRequest.section,
      requestedChanges: hrmEssProfileUpdateRequest.requestedChanges,
      status: hrmEssProfileUpdateRequest.status,
      reviewNote: hrmEssProfileUpdateRequest.reviewNote,
      reviewedByUserId: hrmEssProfileUpdateRequest.reviewedByUserId,
      reviewedAt: hrmEssProfileUpdateRequest.reviewedAt,
      submittedByUserId: hrmEssProfileUpdateRequest.submittedByUserId,
      createdAt: hrmEssProfileUpdateRequest.createdAt,
      updatedAt: hrmEssProfileUpdateRequest.updatedAt,
    })
    .from(hrmEssProfileUpdateRequest)
    .where(
      and(
        eq(hrmEssProfileUpdateRequest.organizationId, input.organizationId),
        eq(hrmEssProfileUpdateRequest.status, "pending")
      )
    )
    .orderBy(desc(hrmEssProfileUpdateRequest.createdAt))
    .limit(input.limit ?? 100)

  return rows.map((row) => ({
    ...row,
    requestedChanges: parseRequestedChanges(row.requestedChanges),
  }))
}

/**
 * Fetches a single profile update request by ID, scoped to the organization.
 */
export async function getProfileUpdateRequestById(input: {
  readonly organizationId: string
  readonly requestId: string
}): Promise<EssProfileUpdateRequestRow | null> {
  const [row] = await db
    .select({
      id: hrmEssProfileUpdateRequest.id,
      employeeId: hrmEssProfileUpdateRequest.employeeId,
      section: hrmEssProfileUpdateRequest.section,
      requestedChanges: hrmEssProfileUpdateRequest.requestedChanges,
      status: hrmEssProfileUpdateRequest.status,
      reviewNote: hrmEssProfileUpdateRequest.reviewNote,
      reviewedByUserId: hrmEssProfileUpdateRequest.reviewedByUserId,
      reviewedAt: hrmEssProfileUpdateRequest.reviewedAt,
      submittedByUserId: hrmEssProfileUpdateRequest.submittedByUserId,
      createdAt: hrmEssProfileUpdateRequest.createdAt,
      updatedAt: hrmEssProfileUpdateRequest.updatedAt,
    })
    .from(hrmEssProfileUpdateRequest)
    .where(
      and(
        eq(hrmEssProfileUpdateRequest.organizationId, input.organizationId),
        eq(hrmEssProfileUpdateRequest.id, input.requestId)
      )
    )
    .limit(1)

  if (!row) return null
  return { ...row, requestedChanges: parseRequestedChanges(row.requestedChanges) }
}
