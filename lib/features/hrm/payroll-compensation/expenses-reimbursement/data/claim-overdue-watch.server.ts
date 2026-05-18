import "server-only"

import { and, eq, inArray, isNotNull, lt } from "drizzle-orm"

import { writeIamAuditEvent } from "#lib/auth"
import { db } from "#lib/db"
import { hrmClaim, hrmClaimType, iamAuditEvent } from "#lib/db/schema"
import type {
  CronTickInput,
  CronTickScannedEmittedSummary,
} from "#lib/erp/cron-tick.shared"

import {
  HRM_CLAIM_EVENT_TYPES,
  HRM_EXPENSE_REIMBURSEMENT_AUDIT,
} from "../expense-reimbursement.contract"
import { fanoutClaimLifecycleEvent } from "./claim-notification.server"

/** Business days proxy — calendar days pending approval before overdue signal. */
export const CLAIM_APPROVAL_OVERDUE_DAYS = 7

const OVERDUE_WATCH_BATCH_LIMIT = 200

export type ClaimOverdueWatchTickSummary = CronTickScannedEmittedSummary & {
  readonly skippedAlreadyAudited: number
  readonly fanoutDelivered: number
}

type OverdueCandidate = {
  readonly claimId: string
  readonly organizationId: string
  readonly claimNumber: string | null
  readonly claimTypeCode: string
  readonly claimDate: string
  readonly amount: string
  readonly currency: string
  readonly requiresExceptionApproval: boolean
  readonly submittedAt: Date
}

/**
 * Daily cron — emits `erp.hrm.claim.overdue` once per claim stuck in
 * `submitted` past {@link CLAIM_APPROVAL_OVERDUE_DAYS}. Idempotent via IAM audit.
 */
export async function runClaimApprovalOverdueTick(
  input?: CronTickInput
): Promise<ClaimOverdueWatchTickSummary> {
  const now = input?.now ?? new Date()
  const cutoff = new Date(now)
  cutoff.setUTCDate(cutoff.getUTCDate() - CLAIM_APPROVAL_OVERDUE_DAYS)

  const rows = await db
    .select({
      claimId: hrmClaim.id,
      organizationId: hrmClaim.organizationId,
      claimNumber: hrmClaim.claimNumber,
      claimTypeCode: hrmClaimType.code,
      claimDate: hrmClaim.claimDate,
      amount: hrmClaim.amount,
      currency: hrmClaim.currency,
      requiresExceptionApproval: hrmClaim.requiresExceptionApproval,
      submittedAt: hrmClaim.submittedAt,
    })
    .from(hrmClaim)
    .innerJoin(hrmClaimType, eq(hrmClaimType.id, hrmClaim.claimTypeId))
    .where(
      and(
        eq(hrmClaim.state, "submitted"),
        isNotNull(hrmClaim.submittedAt),
        lt(hrmClaim.submittedAt, cutoff)
      )
    )
    .limit(input?.batchLimit ?? OVERDUE_WATCH_BATCH_LIMIT)

  if (rows.length === 0) {
    return {
      scanned: 0,
      emitted: 0,
      skippedAlreadyAudited: 0,
      fanoutDelivered: 0,
    }
  }

  const candidates: OverdueCandidate[] = rows.map((row) => ({
    claimId: row.claimId,
    organizationId: row.organizationId,
    claimNumber: row.claimNumber,
    claimTypeCode: row.claimTypeCode ?? "claim",
    claimDate: row.claimDate,
    amount: row.amount,
    currency: row.currency,
    requiresExceptionApproval: row.requiresExceptionApproval,
    submittedAt: row.submittedAt!,
  }))

  const claimIds = candidates.map((c) => c.claimId)
  const emittedRows = await db
    .selectDistinct({ resourceId: iamAuditEvent.resourceId })
    .from(iamAuditEvent)
    .where(
      and(
        eq(iamAuditEvent.action, HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.overdue),
        eq(iamAuditEvent.resourceType, "hrm_claim"),
        inArray(iamAuditEvent.resourceId, claimIds)
      )
    )

  const alreadyEmitted = new Set(
    emittedRows
      .map((r) => r.resourceId)
      .filter((id): id is string => typeof id === "string" && id.length > 0)
  )

  let emitted = 0
  let skippedAlreadyAudited = 0
  let fanoutDelivered = 0

  for (const candidate of candidates) {
    if (alreadyEmitted.has(candidate.claimId)) {
      skippedAlreadyAudited += 1
      continue
    }

    try {
      await writeIamAuditEvent({
        action: HRM_EXPENSE_REIMBURSEMENT_AUDIT.claim.overdue,
        organizationId: candidate.organizationId,
        actorUserId: null,
        actorSessionId: null,
        resourceType: "hrm_claim",
        resourceId: candidate.claimId,
        metadata: {
          claimNumber: candidate.claimNumber,
          claimTypeCode: candidate.claimTypeCode,
          claimDate: candidate.claimDate,
          submittedAt: candidate.submittedAt.toISOString(),
          overdueDays: CLAIM_APPROVAL_OVERDUE_DAYS,
        },
      })
      emitted += 1
    } catch {
      continue
    }

    const fanout = await fanoutClaimLifecycleEvent({
      organizationId: candidate.organizationId,
      eventType: HRM_CLAIM_EVENT_TYPES.overdue,
      payload: {
        claimId: candidate.claimId,
        claimNumber: candidate.claimNumber,
        claimTypeCode: candidate.claimTypeCode,
        claimDate: candidate.claimDate,
        amount: candidate.amount,
        currency: candidate.currency,
        state: "submitted",
        expenseFundCode: null,
        requiresExceptionApproval: candidate.requiresExceptionApproval,
      },
      now,
    })
    if (fanout.code === "delivered") {
      fanoutDelivered += 1
    }
  }

  return {
    scanned: rows.length,
    emitted,
    skippedAlreadyAudited,
    fanoutDelivered,
  }
}
