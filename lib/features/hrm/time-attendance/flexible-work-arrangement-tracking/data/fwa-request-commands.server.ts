import "server-only"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import {
  hrmApproval,
  hrmFlexibleWorkArrangementType,
  hrmFlexibleWorkRequest,
  hrmFlexibleWorkSchedulePattern,
} from "#lib/db/schema"

import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { FwaRequestMutationFormState } from "../../../types"
import {
  FWA_REQUEST_APPROVAL_SUBJECT_KIND,
  HRM_FWA_AUDIT,
} from "../fwa.contract"
import {
  buildDefaultSchedulePatternForKind,
  fwaArrangementKindLabel,
} from "./fwa-display.shared"
import { validateFwaEmployeeEligibility } from "./fwa-eligibility.server"
import {
  getFwaArrangementTypeForOrg,
  getFwaEmployeeForOrg,
  resolveFwaApproverUserId,
} from "./fwa.queries.server"
import type { HrmFwaArrangementKind } from "../schemas/fwa-workflow-state.shared"
import { revalidateFwaSurfaces } from "./fwa-revalidate.server"

export type SubmitFwaRequestInput = {
  organizationId: string
  userId: string
  sessionId: string | null
  employeeId: string
  arrangementTypeId: string
  startDate: string
  endDate: string | null
  reason: string
  remoteLocation: string | null
  evidenceDocumentId: string | null
  expectedWeeklyMinutes: number | null
  reviewDate: string | null
  initiatedBy: "employee" | "manager" | "hr"
  renewalOfRequestId?: string | null
  eligibilityExceptionReason?: string | null
}

export async function submitFwaRequest(
  input: SubmitFwaRequestInput
): Promise<FwaRequestMutationFormState> {
  const { organizationId, userId, sessionId } = input

  const [employee, arrangementType] = await Promise.all([
    getFwaEmployeeForOrg(organizationId, input.employeeId),
    getFwaArrangementTypeForOrg(organizationId, input.arrangementTypeId),
  ])

  if (!employee) {
    return hrmActionFailure({ employeeId: "Employee not found." })
  }
  if (employee.archivedAt) {
    return hrmActionFailure({
      employeeId: "Cannot submit for an archived employee.",
    })
  }
  if (!arrangementType) {
    return hrmActionFailure({
      arrangementTypeId: "Arrangement type not found.",
    })
  }
  if (arrangementType.archivedAt) {
    return hrmActionFailure({
      arrangementTypeId: "Arrangement type is archived.",
    })
  }
  if (arrangementType.requiresRemoteLocation && !input.remoteLocation?.trim()) {
    return hrmActionFailure({
      remoteLocation: "Remote location is required for this arrangement type.",
    })
  }
  if (arrangementType.requiresSupportingDocument && !input.evidenceDocumentId) {
    return hrmActionFailure({
      evidenceDocumentId: "Supporting document is required for this type.",
    })
  }

  const eligibility = await validateFwaEmployeeEligibility({
    organizationId,
    arrangementTypeId: input.arrangementTypeId,
    employee,
  })

  let usedEligibilityException = false
  if (!eligibility.eligible) {
    if (!eligibility.allowException || input.initiatedBy === "employee") {
      return hrmActionFailure({
        employeeId: eligibility.reason,
      })
    }
    const exceptionReason = input.eligibilityExceptionReason?.trim()
    if (!exceptionReason) {
      return hrmActionFailure({
        form: "Eligibility exception reason is required for this employee.",
      })
    }
    usedEligibilityException = true
  }

  const approvalSnapshot = {
    employeeId: input.employeeId,
    employeeNumber: employee.employeeNumber,
    employeeFullName: employee.legalName,
    arrangementTypeId: input.arrangementTypeId,
    arrangementTypeCode: arrangementType.code,
    arrangementTypeLabel: arrangementType.label,
    arrangementKind: arrangementType.arrangementKind,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason,
    remoteLocation: input.remoteLocation,
    requestedAt: new Date().toISOString(),
  }

  const currentApproverUserId = await resolveFwaApproverUserId({
    organizationId,
    managerEmployeeId: employee.managerEmployeeId,
  })

  const requestId = crypto.randomUUID()
  const approvalId = crypto.randomUUID()

  const scheduleRows = buildDefaultSchedulePatternForKind(
    arrangementType.arrangementKind as HrmFwaArrangementKind
  )

  await db.transaction(async (tx) => {
    await tx.insert(hrmApproval).values({
      id: approvalId,
      organizationId,
      subjectKind: FWA_REQUEST_APPROVAL_SUBJECT_KIND,
      subjectId: requestId,
      state: "pending",
      requestedByUserId: userId,
      currentApproverUserId,
      snapshot: approvalSnapshot,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    await tx.insert(hrmFlexibleWorkRequest).values({
      id: requestId,
      organizationId,
      employeeId: input.employeeId,
      arrangementTypeId: input.arrangementTypeId,
      reason: input.reason,
      startDate: input.startDate,
      endDate: input.endDate,
      reviewDate: input.reviewDate,
      remoteLocation: input.remoteLocation,
      evidenceDocumentId: input.evidenceDocumentId,
      expectedWeeklyMinutes: input.expectedWeeklyMinutes,
      initiatedBy: input.initiatedBy,
      renewalOfRequestId: input.renewalOfRequestId ?? null,
      state: "submitted",
      currentApprovalId: approvalId,
      createdByUserId: userId,
      updatedByUserId: userId,
    })

    if (scheduleRows.length > 0) {
      await tx.insert(hrmFlexibleWorkSchedulePattern).values(
        scheduleRows.map((row) => ({
          organizationId,
          requestId,
          dayOfWeek: row.dayOfWeek,
          workMode: row.workMode,
          coreStart: row.coreStart ?? null,
          coreEnd: row.coreEnd ?? null,
          flexibleStart: row.flexibleStart ?? null,
          flexibleEnd: row.flexibleEnd ?? null,
          expectedMinutes: row.expectedMinutes ?? null,
        }))
      )
    }
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestCreate,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_request",
    resourceId: requestId,
    metadata: {
      employeeId: input.employeeId,
      arrangementTypeCode: arrangementType.code,
      arrangementKind: arrangementType.arrangementKind,
      arrangementKindLabel: fwaArrangementKindLabel(
        arrangementType.arrangementKind as HrmFwaArrangementKind
      ),
      startDate: input.startDate,
      endDate: input.endDate,
      initiatedBy: input.initiatedBy,
      currentApproverUserId,
      eligibilityException: usedEligibilityException,
    },
  })

  if (usedEligibilityException) {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_FWA_AUDIT.requestException,
      actorUserId: userId,
      actorSessionId: sessionId,
      organizationId,
      resourceType: "hrm_flexible_work_request",
      resourceId: requestId,
      metadata: {
        employeeId: input.employeeId,
        arrangementTypeId: input.arrangementTypeId,
        reason: input.eligibilityExceptionReason,
      },
    })
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.hrm.approval.request",
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_approval",
    resourceId: approvalId,
    metadata: {
      subjectKind: FWA_REQUEST_APPROVAL_SUBJECT_KIND,
      subjectId: requestId,
      currentApproverUserId,
    },
  })

  revalidateFwaSurfaces()
  return { ok: true, requestId }
}

export async function renewFwaRequest(input: {
  organizationId: string
  userId: string
  sessionId: string | null
  sourceRequestId: string
  startDate: string
  endDate: string | null
  reason: string
}): Promise<FwaRequestMutationFormState> {
  const [source] = await db
    .select({
      id: hrmFlexibleWorkRequest.id,
      employeeId: hrmFlexibleWorkRequest.employeeId,
      arrangementTypeId: hrmFlexibleWorkRequest.arrangementTypeId,
      remoteLocation: hrmFlexibleWorkRequest.remoteLocation,
      evidenceDocumentId: hrmFlexibleWorkRequest.evidenceDocumentId,
      expectedWeeklyMinutes: hrmFlexibleWorkRequest.expectedWeeklyMinutes,
      reviewDate: hrmFlexibleWorkRequest.reviewDate,
      state: hrmFlexibleWorkRequest.state,
    })
    .from(hrmFlexibleWorkRequest)
    .where(
      and(
        eq(hrmFlexibleWorkRequest.id, input.sourceRequestId),
        eq(hrmFlexibleWorkRequest.organizationId, input.organizationId)
      )
    )
    .limit(1)

  if (!source) {
    return hrmActionFailure({ form: "Arrangement request not found." })
  }
  if (source.state !== "active") {
    return hrmActionFailure({
      form: "Only active arrangements can be renewed.",
    })
  }

  const result = await submitFwaRequest({
    organizationId: input.organizationId,
    userId: input.userId,
    sessionId: input.sessionId,
    employeeId: source.employeeId,
    arrangementTypeId: source.arrangementTypeId,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason,
    remoteLocation: source.remoteLocation,
    evidenceDocumentId: source.evidenceDocumentId,
    expectedWeeklyMinutes: source.expectedWeeklyMinutes,
    reviewDate: source.reviewDate,
    initiatedBy: "hr",
    renewalOfRequestId: source.id,
  })

  if (!result.ok) {
    return result
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.requestRenew,
    actorUserId: input.userId,
    actorSessionId: input.sessionId,
    organizationId: input.organizationId,
    resourceType: "hrm_flexible_work_request",
    resourceId: result.requestId,
    metadata: {
      renewalOfRequestId: source.id,
      startDate: input.startDate,
      endDate: input.endDate,
    },
  })

  return result
}

export async function seedDefaultFwaArrangementTypes(input: {
  organizationId: string
  userId: string
  sessionId: string | null
}): Promise<{ seeded: string[]; skipped: string[] }> {
  const defaults = [
    {
      code: "HYBRID_STD",
      label: "Standard hybrid",
      arrangementKind: "hybrid" as const,
      description: "Mix of office and remote days (Mon/Wed/Fri office).",
      requiresRemoteLocation: false,
      requiresSupportingDocument: false,
    },
    {
      code: "REMOTE_FULL",
      label: "Fully remote",
      arrangementKind: "remote" as const,
      description: "Work remotely with an approved location.",
      requiresRemoteLocation: true,
      requiresSupportingDocument: false,
    },
    {
      code: "FLEX_HOURS",
      label: "Flexible hours",
      arrangementKind: "flexible_hours" as const,
      description: "Flexible start and end within core hours.",
      requiresRemoteLocation: false,
      requiresSupportingDocument: false,
    },
    {
      code: "COMPRESSED",
      label: "Compressed work week",
      arrangementKind: "compressed" as const,
      description: "Four-day week with extended daily hours.",
      requiresRemoteLocation: false,
      requiresSupportingDocument: false,
    },
    {
      code: "PART_TIME",
      label: "Part-time schedule",
      arrangementKind: "part_time" as const,
      description: "Reduced working days per week.",
      requiresRemoteLocation: false,
      requiresSupportingDocument: false,
    },
    {
      code: "TEMPORARY",
      label: "Temporary arrangement",
      arrangementKind: "temporary" as const,
      description: "Short-term flexible work with end date.",
      requiresRemoteLocation: false,
      requiresSupportingDocument: true,
    },
    {
      code: "STAGGERED_STD",
      label: "Staggered hours",
      arrangementKind: "staggered" as const,
      description: "Early-shift office pattern with fixed core hours.",
      requiresRemoteLocation: false,
      requiresSupportingDocument: false,
    },
  ]

  const seeded: string[] = []
  const skipped: string[] = []

  for (const row of defaults) {
    const existing = await db.query.hrmFlexibleWorkArrangementType.findFirst({
      where: and(
        eq(hrmFlexibleWorkArrangementType.organizationId, input.organizationId),
        eq(hrmFlexibleWorkArrangementType.code, row.code)
      ),
      columns: { id: true },
    })

    if (existing) {
      skipped.push(row.code)
      continue
    }

    await db.insert(hrmFlexibleWorkArrangementType).values({
      organizationId: input.organizationId,
      code: row.code,
      label: row.label,
      arrangementKind: row.arrangementKind,
      description: row.description,
      requiresRemoteLocation: row.requiresRemoteLocation,
      requiresSupportingDocument: row.requiresSupportingDocument,
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    })
    seeded.push(row.code)
  }

  if (seeded.length > 0) {
    await writeIamAuditEventFromNextHeaders({
      action: HRM_FWA_AUDIT.typeSeed,
      actorUserId: input.userId,
      actorSessionId: input.sessionId,
      organizationId: input.organizationId,
      resourceType: "hrm_flexible_work_arrangement_type",
      resourceId: input.organizationId,
      metadata: { seeded, skipped },
    })
    revalidateFwaSurfaces()
  }

  return { seeded, skipped }
}
