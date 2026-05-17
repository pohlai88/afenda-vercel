import "server-only"

import { and, asc, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmApproval } from "#lib/db/schema"

import { listPendingProfileUpdateRequestsForOrg } from "./employee-portal-profile-request.queries.server"
import { listPendingDocumentRequestsForOrg } from "./employee-portal-document-request.queries.server"

export type EmployeePortalApprovalInboxKind =
  | "leave_request"
  | "claim"
  | "profile_update"
  | "document_request"

export type EmployeePortalApprovalInboxRow = {
  readonly id: string
  readonly kind: EmployeePortalApprovalInboxKind
  readonly subjectId: string
  readonly employeeId: string | null
  readonly status: string
  readonly label: string
  readonly requestedAt: Date
}

const WORKFLOW_APPROVAL_KINDS = ["leave_request", "claim"] as const

export async function listEmployeePortalApprovalInbox(input: {
  readonly organizationId: string
  readonly approverUserId?: string | null
  readonly includeHrQueue?: boolean
  readonly limit?: number
}): Promise<EmployeePortalApprovalInboxRow[]> {
  const limit = input.limit ?? 100

  const [workflowApprovals, profileRequests, documentRequests] =
    await Promise.all([
      db
        .select({
          id: hrmApproval.id,
          subjectKind: hrmApproval.subjectKind,
          subjectId: hrmApproval.subjectId,
          requestedAt: hrmApproval.requestedAt,
        })
        .from(hrmApproval)
        .where(
          and(
            eq(hrmApproval.organizationId, input.organizationId),
            eq(hrmApproval.state, "pending"),
            inArray(hrmApproval.subjectKind, [...WORKFLOW_APPROVAL_KINDS]),
            input.approverUserId
              ? eq(hrmApproval.currentApproverUserId, input.approverUserId)
              : undefined
          )
        )
        .orderBy(asc(hrmApproval.requestedAt))
        .limit(limit),
      input.includeHrQueue
        ? listPendingProfileUpdateRequestsForOrg({
            organizationId: input.organizationId,
            limit,
          })
        : Promise.resolve([]),
      input.includeHrQueue
        ? listPendingDocumentRequestsForOrg({
            organizationId: input.organizationId,
            limit,
          })
        : Promise.resolve([]),
    ])

  const rows: EmployeePortalApprovalInboxRow[] = workflowApprovals.map(
    (approval) => ({
      id: approval.id,
      kind: approval.subjectKind as "leave_request" | "claim",
      subjectId: approval.subjectId,
      employeeId: null,
      status: "pending",
      label: approval.subjectKind.replaceAll("_", " "),
      requestedAt: approval.requestedAt,
    })
  )

  for (const request of profileRequests) {
    rows.push({
      id: request.id,
      kind: "profile_update",
      subjectId: request.id,
      employeeId: request.employeeId,
      status: request.status,
      label: `Profile update: ${request.section}`,
      requestedAt: request.createdAt,
    })
  }

  for (const request of documentRequests) {
    rows.push({
      id: request.id,
      kind: "document_request",
      subjectId: request.id,
      employeeId: request.employeeId,
      status: request.status,
      label: request.title,
      requestedAt: request.submittedAt,
    })
  }

  return rows
    .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime())
    .slice(0, limit)
}
