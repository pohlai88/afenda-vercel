import "server-only"

import { and, eq, inArray } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBoardingInstance,
  hrmBoardingTask,
  hrmEmployee,
  hrmOffboardingApprovalStep,
  hrmOffboardingClearanceItem,
  hrmOffboardingInstance,
} from "#lib/db/schema"

import {
  createOffboardingInstanceForTermination,
  type HrmBoardingDbExecutor,
} from "../../employee-lifecycle-management/data/boarding.mutations.server"
import { deriveBoardingInstanceStatus } from "../../employee-lifecycle-management/data/boarding-status.shared"
import type {
  BoardingStatus,
  BoardingTaskStatus,
} from "../../employee-lifecycle-management/schemas/boarding.schema"
import { buildDefaultOffboardingChecklist } from "./offboarding-defaults.shared"
import {
  HRM_OFFBOARDING_ACTIVE_STATUSES,
  HRM_OFFBOARDING_MUTABLE_STATUSES,
} from "./offboarding-exit-status.shared"
import type { HrmOffboardingExitType } from "./offboarding-exit-type.shared"
import {
  mergeOffboardingInstanceDetails,
  type OffboardingInstanceDetailsPatch,
} from "./offboarding-instance-metadata.server"

export type HrmOffboardingDbExecutor = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export type OffboardingApprovalStepSeed = {
  readonly stepKey: string
  readonly approverRole: "manager" | "hr" | "management" | "legal"
  readonly sortOrder: number
}

export type OffboardingClearanceItemSeed = {
  readonly category: string
  readonly itemKey: string
  readonly title: string
  readonly ownerRole: string
  readonly dueOffsetDays: number
}

export type InitiateOffboardingMutationInput = {
  readonly organizationId: string
  readonly employeeId: string
  readonly exitType: HrmOffboardingExitType
  readonly exitReason: string
  readonly terminationDate: string
  readonly lastWorkingDate: string
  readonly effectiveSeparationDate?: string
  readonly noticeStartDate?: string
  readonly noticeEndDate?: string
  readonly requiredNoticeDays?: number
  readonly noticeWaived?: boolean
  readonly shortNotice?: boolean
  readonly skipApproval?: boolean
  readonly actorUserId: string
  readonly contractId?: string | null
}

export type OffboardingMutationResult =
  | {
      readonly ok: true
      readonly instanceId: string
      readonly employeeId: string
      readonly status: string
      readonly boardingInstanceId: string | null
    }
  | { readonly ok: false; readonly message: string }

export type OffboardingTaskTransition = "start" | "complete" | "block" | "waive"

export type TransitionOffboardingTaskMutationInput = {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly taskKey: string
  readonly transition: OffboardingTaskTransition
  readonly actorUserId: string
  readonly note?: string
  readonly waiverReason?: string
  readonly evidenceDocumentId?: string
  readonly allowedOwnerRoles?: readonly string[]
}

const DEFAULT_CLEARANCE_ITEMS: readonly OffboardingClearanceItemSeed[] = [
  {
    category: "handover",
    itemKey: "work_handover",
    title: "Work handover",
    ownerRole: "manager",
    dueOffsetDays: 1,
  },
  {
    category: "handover",
    itemKey: "employee_handover_acknowledgement",
    title: "Employee handover acknowledgement",
    ownerRole: "employee",
    dueOffsetDays: 1,
  },
  {
    category: "asset",
    itemKey: "asset_recovery",
    title: "Company asset recovery",
    ownerRole: "asset_owner",
    dueOffsetDays: 1,
  },
  {
    category: "access",
    itemKey: "access_revocation",
    title: "Access revocation",
    ownerRole: "it",
    dueOffsetDays: 0,
  },
  {
    category: "document",
    itemKey: "exit_documents",
    title: "Exit document completion",
    ownerRole: "hr",
    dueOffsetDays: 2,
  },
  {
    category: "leave_attendance",
    itemKey: "leave_attendance_clearance",
    title: "Leave and attendance clearance",
    ownerRole: "hr",
    dueOffsetDays: 2,
  },
  {
    category: "claims_advance",
    itemKey: "claims_advance_clearance",
    title: "Claims, advances, and employee debt clearance",
    ownerRole: "finance",
    dueOffsetDays: 2,
  },
  {
    category: "payroll",
    itemKey: "final_settlement_readiness",
    title: "Final settlement readiness",
    ownerRole: "payroll",
    dueOffsetDays: 2,
  },
  {
    category: "vacancy",
    itemKey: "replacement_or_vacancy_review",
    title: "Replacement or vacancy review",
    ownerRole: "manager",
    dueOffsetDays: 3,
  },
]

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10)
}

function addUtcDays(anchor: Date, days: number): Date {
  return new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() + days
    )
  )
}

function dateOnlyOrNull(value: string | undefined): Date | null {
  return value ? parseDateOnly(value) : null
}

function completedEmploymentStatus(
  exitType: string | null
): "retired" | "separated" {
  return exitType === "retirement" ? "retired" : "separated"
}

function initiationEmploymentStatus(
  exitType: HrmOffboardingExitType
): "notice_period" | "offboarding" {
  return exitType === "resignation" ? "notice_period" : "offboarding"
}

export function buildOffboardingApprovalSteps(input: {
  readonly exitType: HrmOffboardingExitType
  readonly skipApproval?: boolean
}): readonly OffboardingApprovalStepSeed[] {
  if (input.skipApproval) return []

  const steps: OffboardingApprovalStepSeed[] = [
    { stepKey: "manager_review", approverRole: "manager", sortOrder: 10 },
    { stepKey: "hr_review", approverRole: "hr", sortOrder: 20 },
  ]

  if (
    input.exitType === "termination" ||
    input.exitType === "redundancy" ||
    input.exitType === "death"
  ) {
    steps.push({
      stepKey: "management_review",
      approverRole: "management",
      sortOrder: 30,
    })
  }

  if (input.exitType === "termination" || input.exitType === "death") {
    steps.push({
      stepKey: "legal_review",
      approverRole: "legal",
      sortOrder: 40,
    })
  }

  return steps
}

export function buildDefaultOffboardingClearanceItems(input: {
  readonly lastWorkingDate: string
}): readonly (OffboardingClearanceItemSeed & { readonly dueAt: Date })[] {
  const anchor = parseDateOnly(input.lastWorkingDate)
  return DEFAULT_CLEARANCE_ITEMS.map((item) => ({
    ...item,
    dueAt: addUtcDays(anchor, item.dueOffsetDays),
  }))
}

export async function initiateOffboardingMutation(
  input: InitiateOffboardingMutationInput
): Promise<OffboardingMutationResult> {
  return db.transaction(async (tx) => {
    const existing = await tx.query.hrmOffboardingInstance.findFirst({
      where: and(
        eq(hrmOffboardingInstance.organizationId, input.organizationId),
        eq(hrmOffboardingInstance.employeeId, input.employeeId),
        inArray(hrmOffboardingInstance.status, [
          ...HRM_OFFBOARDING_ACTIVE_STATUSES,
        ])
      ),
      columns: { id: true },
    })

    if (existing) {
      return {
        ok: false,
        message:
          "An active offboarding process already exists for this employee.",
      }
    }

    const terminationDate = parseDateOnly(input.terminationDate)
    const lastWorkingDate = parseDateOnly(input.lastWorkingDate)
    const status = input.skipApproval ? "open" : "pending_approval"
    const details = {
      exitType: input.exitType,
      exitReason: input.exitReason,
      lastWorkingDate: input.lastWorkingDate,
      noticeStartDate: input.noticeStartDate ?? null,
      noticeEndDate: input.noticeEndDate ?? null,
      noticeWaived: input.noticeWaived ?? false,
      shortNotice: input.shortNotice ?? false,
      settlementReadinessStatus: "pending_clearance",
      settlementBlockers: [],
      rehireEligibility: null,
    } satisfies OffboardingInstanceDetailsPatch

    const boarding = await createOffboardingInstanceForTermination(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      contractId: input.contractId ?? null,
      startDate: terminationDate,
      actorUserId: input.actorUserId,
      criteria: { exitType: input.exitType },
    })

    const [row] = await tx
      .insert(hrmOffboardingInstance)
      .values({
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        terminationDate,
        exitType: input.exitType,
        exitReason: input.exitReason,
        effectiveSeparationDate:
          dateOnlyOrNull(input.effectiveSeparationDate) ?? lastWorkingDate,
        noticeStartDate: dateOnlyOrNull(input.noticeStartDate),
        noticeEndDate: dateOnlyOrNull(input.noticeEndDate),
        requiredNoticeDays: input.requiredNoticeDays ?? null,
        noticeWaived: input.noticeWaived ?? false,
        shortNotice: input.shortNotice ?? false,
        lastWorkingDate,
        boardingInstanceId: boarding.instanceId,
        settlementReadinessStatus: "pending_clearance",
        settlementBlockers: [],
        checklist: buildDefaultOffboardingChecklist(input.lastWorkingDate),
        status,
        audit7w1h: mergeOffboardingInstanceDetails(null, details),
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      })
      .returning({ id: hrmOffboardingInstance.id })

    const approvalSteps = buildOffboardingApprovalSteps({
      exitType: input.exitType,
      skipApproval: input.skipApproval,
    })
    if (approvalSteps.length > 0) {
      await tx.insert(hrmOffboardingApprovalStep).values(
        approvalSteps.map((step) => ({
          organizationId: input.organizationId,
          offboardingInstanceId: row.id,
          stepKey: step.stepKey,
          approverRole: step.approverRole,
          status: "pending",
          sortOrder: step.sortOrder,
          createdByUserId: input.actorUserId,
          updatedByUserId: input.actorUserId,
        }))
      )
    }

    const clearanceItems = buildDefaultOffboardingClearanceItems({
      lastWorkingDate: input.lastWorkingDate,
    })
    await tx.insert(hrmOffboardingClearanceItem).values(
      clearanceItems.map((item) => ({
        organizationId: input.organizationId,
        offboardingInstanceId: row.id,
        employeeId: input.employeeId,
        category: item.category,
        itemKey: item.itemKey,
        title: item.title,
        ownerRole: item.ownerRole,
        status: "pending",
        dueAt: item.dueAt,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      }))
    )

    await tx
      .update(hrmEmployee)
      .set({
        employmentStatus: initiationEmploymentStatus(input.exitType),
        resignationDate:
          input.exitType === "resignation" ? terminationDate : undefined,
        retirementDate:
          input.exitType === "retirement" ? terminationDate : undefined,
        lastWorkingDate,
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )

    return {
      ok: true,
      instanceId: row.id,
      employeeId: input.employeeId,
      status,
      boardingInstanceId: boarding.instanceId,
    }
  })
}

export async function insertDefaultOffboardingInstance(
  tx: HrmOffboardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly terminationDate: Date
    readonly createdByUserId: string
    readonly details?: OffboardingInstanceDetailsPatch
    readonly contractId?: string | null
  }
): Promise<string | null> {
  const existing = await tx.query.hrmOffboardingInstance.findFirst({
    where: and(
      eq(hrmOffboardingInstance.organizationId, input.organizationId),
      eq(hrmOffboardingInstance.employeeId, input.employeeId),
      inArray(hrmOffboardingInstance.status, [
        ...HRM_OFFBOARDING_ACTIVE_STATUSES,
      ])
    ),
    columns: { id: true },
  })
  if (existing) return null

  const lastWorkingDate =
    typeof input.details?.lastWorkingDate === "string"
      ? input.details.lastWorkingDate
      : formatDateOnly(input.terminationDate)
  const exitType =
    typeof input.details?.exitType === "string" ? input.details.exitType : null
  const boarding = await createOffboardingInstanceForTermination(tx, {
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    contractId: input.contractId ?? null,
    startDate: input.terminationDate,
    actorUserId: input.createdByUserId,
    criteria: exitType ? { exitType } : undefined,
  })

  const [row] = await tx
    .insert(hrmOffboardingInstance)
    .values({
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      terminationDate: input.terminationDate,
      exitType,
      exitReason:
        typeof input.details?.exitReason === "string"
          ? input.details.exitReason
          : null,
      effectiveSeparationDate: parseDateOnly(lastWorkingDate),
      noticeStartDate: dateOnlyOrNull(
        input.details?.noticeStartDate ?? undefined
      ),
      noticeEndDate: dateOnlyOrNull(input.details?.noticeEndDate ?? undefined),
      noticeWaived: input.details?.noticeWaived ?? false,
      shortNotice: input.details?.shortNotice ?? false,
      lastWorkingDate: parseDateOnly(lastWorkingDate),
      boardingInstanceId: boarding.instanceId,
      settlementReadinessStatus:
        input.details?.settlementReadinessStatus ?? "pending_clearance",
      settlementBlockers: input.details?.settlementBlockers ?? [],
      rehireEligibility: input.details?.rehireEligibility ?? null,
      checklist: buildDefaultOffboardingChecklist(lastWorkingDate),
      audit7w1h: input.details
        ? mergeOffboardingInstanceDetails(null, input.details)
        : null,
      status: "open",
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
    })
    .returning({ id: hrmOffboardingInstance.id })

  const clearanceItems = buildDefaultOffboardingClearanceItems({
    lastWorkingDate,
  })
  await tx.insert(hrmOffboardingClearanceItem).values(
    clearanceItems.map((item) => ({
      organizationId: input.organizationId,
      offboardingInstanceId: row.id,
      employeeId: input.employeeId,
      category: item.category,
      itemKey: item.itemKey,
      title: item.title,
      ownerRole: item.ownerRole,
      status: "pending",
      dueAt: item.dueAt,
      createdByUserId: input.createdByUserId,
      updatedByUserId: input.createdByUserId,
    }))
  )

  return row.id
}

export async function reviewOffboardingApprovalMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly decision: "approved" | "rejected"
  readonly reviewNote?: string
  readonly actorUserId: string
}): Promise<OffboardingMutationResult> {
  return db.transaction(async (tx) => {
    const instance = await tx.query.hrmOffboardingInstance.findFirst({
      where: and(
        eq(hrmOffboardingInstance.organizationId, input.organizationId),
        eq(hrmOffboardingInstance.id, input.instanceId),
        eq(hrmOffboardingInstance.employeeId, input.employeeId)
      ),
      columns: {
        id: true,
        status: true,
        boardingInstanceId: true,
        audit7w1h: true,
      },
    })

    if (!instance || instance.status !== "pending_approval") {
      return { ok: false, message: "Pending offboarding approval not found." }
    }

    const approved = input.decision === "approved"
    const now = new Date()
    await tx
      .update(hrmOffboardingApprovalStep)
      .set({
        status: approved ? "approved" : "rejected",
        reviewNote: input.reviewNote ?? null,
        reviewedAt: now,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmOffboardingApprovalStep.organizationId, input.organizationId),
          eq(
            hrmOffboardingApprovalStep.offboardingInstanceId,
            input.instanceId
          ),
          eq(hrmOffboardingApprovalStep.status, "pending")
        )
      )

    await tx
      .update(hrmOffboardingInstance)
      .set({
        status: approved ? "open" : "cancelled",
        audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
          approvalReviewNote: input.reviewNote ?? null,
        }),
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmOffboardingInstance.id, instance.id))

    if (instance.boardingInstanceId && !approved) {
      await tx
        .update(hrmBoardingInstance)
        .set({
          status: "cancelled",
          cancelledAt: now,
          updatedAt: now,
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmBoardingInstance.id, instance.boardingInstanceId))
    }

    return {
      ok: true,
      instanceId: instance.id,
      employeeId: input.employeeId,
      status: approved ? "open" : "cancelled",
      boardingInstanceId: instance.boardingInstanceId,
    }
  })
}

async function getMutableOffboardingInstance(
  tx: HrmOffboardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly instanceId: string
    readonly employeeId: string
  }
) {
  return tx.query.hrmOffboardingInstance.findFirst({
    where: and(
      eq(hrmOffboardingInstance.organizationId, input.organizationId),
      eq(hrmOffboardingInstance.id, input.instanceId),
      eq(hrmOffboardingInstance.employeeId, input.employeeId),
      inArray(hrmOffboardingInstance.status, [
        ...HRM_OFFBOARDING_MUTABLE_STATUSES,
      ])
    ),
    columns: {
      id: true,
      status: true,
      exitType: true,
      boardingInstanceId: true,
      checklist: true,
      audit7w1h: true,
    },
  })
}

export async function scheduleExitInterviewMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly scheduledAt: string
  readonly interviewerNote?: string
  readonly actorUserId: string
}): Promise<OffboardingMutationResult> {
  return updateMutableOffboardingInstance(input, {
    exitInterviewScheduledAt: new Date(input.scheduledAt),
    exitInterviewNote: input.interviewerNote ?? null,
  })
}

export async function recordExitInterviewFeedbackMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly completedAt: string
  readonly feedbackSummary: string
  readonly wouldRehire?: boolean
  readonly actorUserId: string
}): Promise<OffboardingMutationResult> {
  return updateMutableOffboardingInstance(input, {
    exitInterviewCompletedAt: new Date(input.completedAt),
    exitInterviewFeedbackSummary: input.feedbackSummary,
    exitInterviewWouldRehire: input.wouldRehire ?? null,
  })
}

export async function updateSettlementReadinessMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly settlementReadinessStatus: string
  readonly settlementBlockers: readonly { code: string; message: string }[]
  readonly finalSettlementReference?: string
  readonly actorUserId: string
}): Promise<OffboardingMutationResult> {
  return db.transaction(async (tx) => {
    const instance = await getMutableOffboardingInstance(tx, input)
    if (!instance) {
      return { ok: false, message: "Open offboarding instance not found." }
    }

    const nextStatus =
      input.settlementReadinessStatus === "blocked"
        ? "blocked"
        : instance.status === "blocked"
          ? "in_progress"
          : instance.status

    await tx
      .update(hrmOffboardingInstance)
      .set({
        status: nextStatus,
        settlementReadinessStatus: input.settlementReadinessStatus,
        settlementBlockers: input.settlementBlockers,
        finalSettlementReference: input.finalSettlementReference ?? null,
        audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, {
          settlementReadinessStatus:
            input.settlementReadinessStatus as OffboardingInstanceDetailsPatch["settlementReadinessStatus"],
          settlementBlockers: input.settlementBlockers,
          finalSettlementReference: input.finalSettlementReference ?? null,
        }),
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmOffboardingInstance.id, instance.id))

    return {
      ok: true,
      instanceId: instance.id,
      employeeId: input.employeeId,
      status: nextStatus,
      boardingInstanceId: instance.boardingInstanceId,
    }
  })
}

export async function setRehireEligibilityMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly rehireEligibility: string
  readonly note?: string
  readonly actorUserId: string
}): Promise<OffboardingMutationResult> {
  return updateMutableOffboardingInstance(input, {
    rehireEligibility:
      input.rehireEligibility as OffboardingInstanceDetailsPatch["rehireEligibility"],
    rehireEligibilityNote: input.note ?? null,
  })
}

export async function closeOffboardingCaseMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly actorUserId: string
  readonly closureNote?: string
}): Promise<OffboardingMutationResult> {
  return db.transaction(async (tx) => {
    const instance = await getMutableOffboardingInstance(tx, input)
    if (!instance) {
      return { ok: false, message: "Open offboarding instance not found." }
    }

    const now = new Date()

    if (instance.boardingInstanceId) {
      const tasks = await tx
        .select({
          required: hrmBoardingTask.required,
          status: hrmBoardingTask.status,
        })
        .from(hrmBoardingTask)
        .where(
          and(
            eq(hrmBoardingTask.organizationId, input.organizationId),
            eq(hrmBoardingTask.instanceId, instance.boardingInstanceId)
          )
        )

      const boardingStatus = deriveBoardingInstanceStatus(tasks)
      if (boardingStatus !== "completed") {
        return {
          ok: false,
          message:
            "All required offboarding tasks must be completed or waived before closure.",
        }
      }

      await tx
        .update(hrmBoardingInstance)
        .set({
          status: "completed",
          completedAt: now,
          updatedAt: now,
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmBoardingInstance.id, instance.boardingInstanceId))
    } else {
      const checklist = Array.isArray(instance.checklist) ? instance.checklist : []
      const allDone =
        checklist.length > 0 &&
        checklist.every(
          (task) =>
            task &&
            typeof task === "object" &&
            ((task as Record<string, unknown>).status === "waived" ||
              (task as Record<string, unknown>).completedAt)
        )

      if (!allDone) {
        return {
          ok: false,
          message:
            "All required offboarding tasks must be completed or waived before closure.",
        }
      }
    }

    await finalizeOffboardingClosure(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      instanceId: instance.id,
      exitType: instance.exitType,
      actorUserId: input.actorUserId,
      now,
      detailsPatch: {
        closureNote: input.closureNote ?? null,
      },
    })

    return {
      ok: true,
      instanceId: instance.id,
      employeeId: input.employeeId,
      status: "completed",
      boardingInstanceId: instance.boardingInstanceId,
    }
  })
}

async function updateMutableOffboardingInstance(
  input: {
    readonly organizationId: string
    readonly instanceId: string
    readonly employeeId: string
    readonly actorUserId: string
  },
  patch: Partial<typeof hrmOffboardingInstance.$inferInsert> &
    OffboardingInstanceDetailsPatch
): Promise<OffboardingMutationResult> {
  return db.transaction(async (tx) => {
    const instance = await getMutableOffboardingInstance(tx, input)
    if (!instance) {
      return { ok: false, message: "Open offboarding instance not found." }
    }

    await tx
      .update(hrmOffboardingInstance)
      .set({
        ...patch,
        audit7w1h: mergeOffboardingInstanceDetails(instance.audit7w1h, patch),
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmOffboardingInstance.id, instance.id))

    return {
      ok: true,
      instanceId: instance.id,
      employeeId: input.employeeId,
      status: instance.status,
      boardingInstanceId: instance.boardingInstanceId,
    }
  })
}

export async function transitionOffboardingTaskMutation(
  input: TransitionOffboardingTaskMutationInput
): Promise<
  | (OffboardingMutationResult & {
      readonly ok: true
      readonly taskStatus: string
      readonly taskKey: string
    })
  | { readonly ok: false; readonly message: string }
> {
  return db.transaction(async (tx) => {
    const instance = await getMutableOffboardingInstance(tx, input)
    if (!instance) {
      return { ok: false, message: "Open offboarding instance not found." }
    }

    if (!instance.boardingInstanceId) {
      return transitionLegacyChecklistTask(tx, input, instance)
    }

    const [task] = await tx
      .select({
        id: hrmBoardingTask.id,
        status: hrmBoardingTask.status,
        ownerRole: hrmBoardingTask.ownerRole,
      })
      .from(hrmBoardingTask)
      .where(
        and(
          eq(hrmBoardingTask.organizationId, input.organizationId),
          eq(hrmBoardingTask.instanceId, instance.boardingInstanceId),
          eq(hrmBoardingTask.taskKey, input.taskKey)
        )
      )
      .limit(1)

    if (!task) return { ok: false, message: "Offboarding task not found." }
    if (
      input.allowedOwnerRoles &&
      !input.allowedOwnerRoles.includes(task.ownerRole ?? "")
    ) {
      return {
        ok: false,
        message: "This task is not assigned to this surface.",
      }
    }
    if (task.status === "completed" || task.status === "waived") {
      return { ok: false, message: "Offboarding task is already closed." }
    }

    const now = new Date()
    const taskPatch = taskPatchForTransition(input, now)
    if (!taskPatch.ok) return taskPatch

    await tx
      .update(hrmBoardingTask)
      .set({
        ...taskPatch.patch,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmBoardingTask.id, task.id))

    const allTasks = await tx
      .select({
        required: hrmBoardingTask.required,
        status: hrmBoardingTask.status,
      })
      .from(hrmBoardingTask)
      .where(
        and(
          eq(hrmBoardingTask.organizationId, input.organizationId),
          eq(hrmBoardingTask.instanceId, instance.boardingInstanceId)
        )
      )

    const boardingStatus = deriveBoardingInstanceStatus(allTasks)
    await tx
      .update(hrmBoardingInstance)
      .set({
        status: boardingStatus,
        startedAt: boardingStatus !== "pending" ? now : undefined,
        completedAt: boardingStatus === "completed" ? now : undefined,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmBoardingInstance.id, instance.boardingInstanceId))

    const offboardingStatus = offboardingStatusForBoarding(boardingStatus)
    await updateOffboardingStatusForTaskTransition(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      instanceId: instance.id,
      exitType: instance.exitType,
      status: offboardingStatus,
      actorUserId: input.actorUserId,
      now,
    })

    return {
      ok: true,
      instanceId: instance.id,
      employeeId: input.employeeId,
      status: offboardingStatus,
      boardingInstanceId: instance.boardingInstanceId,
      taskStatus: taskPatch.status,
      taskKey: input.taskKey,
    }
  })
}

function taskPatchForTransition(
  input: TransitionOffboardingTaskMutationInput,
  now: Date
):
  | {
      ok: true
      status: BoardingTaskStatus
      patch: Partial<typeof hrmBoardingTask.$inferInsert>
    }
  | { ok: false; message: string } {
  switch (input.transition) {
    case "start":
      return {
        ok: true,
        status: "in_progress",
        patch: { status: "in_progress" },
      }
    case "complete":
      return {
        ok: true,
        status: "completed",
        patch: {
          status: "completed",
          completedAt: now,
          completedByUserId: input.actorUserId,
          evidenceDocumentId: input.evidenceDocumentId ?? null,
          evidenceNote: input.note ?? null,
          blockedReason: null,
          blockedAt: null,
          blockedByUserId: null,
        },
      }
    case "block":
      return {
        ok: true,
        status: "blocked",
        patch: {
          status: "blocked",
          blockedReason: input.note ?? "Blocked",
          blockedAt: now,
          blockedByUserId: input.actorUserId,
        },
      }
    case "waive":
      if (!input.waiverReason) {
        return { ok: false, message: "Waiver reason is required." }
      }
      return {
        ok: true,
        status: "waived",
        patch: {
          status: "waived",
          waivedAt: now,
          waivedByUserId: input.actorUserId,
          waiverReason: input.waiverReason,
          evidenceDocumentId: input.evidenceDocumentId ?? null,
          evidenceNote: input.note ?? null,
          blockedReason: null,
          blockedAt: null,
          blockedByUserId: null,
        },
      }
  }
}

function offboardingStatusForBoarding(status: BoardingStatus) {
  switch (status) {
    case "completed":
      return "completed"
    case "blocked":
      return "blocked"
    case "in_progress":
      return "in_progress"
    case "cancelled":
      return "cancelled"
    case "pending":
      return "open"
  }
}

async function updateOffboardingStatusForTaskTransition(
  tx: HrmOffboardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly instanceId: string
    readonly exitType: string | null
    readonly status: string
    readonly actorUserId: string
    readonly now: Date
  }
) {
  if (input.status === "completed") {
    await finalizeOffboardingClosure(tx, {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      instanceId: input.instanceId,
      exitType: input.exitType,
      actorUserId: input.actorUserId,
      now: input.now,
    })
    return
  }

  await tx
    .update(hrmOffboardingInstance)
    .set({
      status: input.status,
      completedAt: undefined,
      updatedAt: input.now,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmOffboardingInstance.id, input.instanceId))
}

async function finalizeOffboardingClosure(
  tx: HrmOffboardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly instanceId: string
    readonly exitType: string | null
    readonly actorUserId: string
    readonly now: Date
    readonly detailsPatch?: OffboardingInstanceDetailsPatch
  }
) {
  const current = await tx.query.hrmOffboardingInstance.findFirst({
    where: eq(hrmOffboardingInstance.id, input.instanceId),
    columns: {
      audit7w1h: true,
    },
  })

  await tx
    .update(hrmOffboardingInstance)
    .set({
      status: "completed",
      completedAt: input.now,
      audit7w1h: input.detailsPatch
        ? mergeOffboardingInstanceDetails(current?.audit7w1h ?? null, input.detailsPatch)
        : undefined,
      updatedAt: input.now,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmOffboardingInstance.id, input.instanceId))

  await tx
    .update(hrmEmployee)
    .set({
      employmentStatus: completedEmploymentStatus(input.exitType),
      updatedAt: input.now,
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
}

async function transitionLegacyChecklistTask(
  tx: HrmOffboardingDbExecutor,
  input: TransitionOffboardingTaskMutationInput,
  instance: {
    readonly id: string
    readonly exitType: string | null
    readonly checklist: unknown
    readonly boardingInstanceId: string | null
  }
) {
  const list = Array.isArray(instance.checklist) ? instance.checklist : []
  const now = new Date()
  let found = false
  let allowed = true
  const next = list.map((task) => {
    if (
      task &&
      typeof task === "object" &&
      (task as Record<string, unknown>).taskKey === input.taskKey
    ) {
      found = true
      const role = String((task as Record<string, unknown>).assignedRole ?? "")
      if (input.allowedOwnerRoles && !input.allowedOwnerRoles.includes(role)) {
        allowed = false
        return task
      }
      return {
        ...(task as Record<string, unknown>),
        status: "completed",
        completedAt: now.toISOString(),
        evidenceNote: input.note ?? null,
      }
    }
    return task
  })
  if (!found)
    return { ok: false, message: "Offboarding task not found." } as const
  if (!allowed) {
    return {
      ok: false,
      message: "This task is not assigned to this surface.",
    } as const
  }
  const allDone =
    next.length > 0 &&
    next.every(
      (task) =>
        task &&
        typeof task === "object" &&
        (task as Record<string, unknown>).completedAt
    )

  const status = allDone ? "completed" : "in_progress"
  await tx
    .update(hrmOffboardingInstance)
    .set({
      checklist: next,
      status,
      completedAt: allDone ? now : undefined,
      updatedAt: now,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(hrmOffboardingInstance.id, instance.id))

  if (allDone) {
    await tx
      .update(hrmEmployee)
      .set({
        employmentStatus: completedEmploymentStatus(instance.exitType),
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmEmployee.organizationId, input.organizationId),
          eq(hrmEmployee.id, input.employeeId)
        )
      )
  }

  return {
    ok: true,
    instanceId: instance.id,
    employeeId: input.employeeId,
    status,
    boardingInstanceId: instance.boardingInstanceId,
    taskStatus: "completed",
    taskKey: input.taskKey,
  } as const
}

export async function upsertOffboardingClearanceItemMutation(input: {
  readonly organizationId: string
  readonly instanceId: string
  readonly employeeId: string
  readonly category: string
  readonly itemKey: string
  readonly title: string
  readonly ownerRole: string
  readonly status: string
  readonly dueAt?: string
  readonly evidenceDocumentId?: string
  readonly evidenceNote?: string
  readonly blockedReason?: string
  readonly referenceType?: string
  readonly referenceId?: string
  readonly actorUserId: string
}): Promise<
  | { readonly ok: true; readonly itemId: string }
  | { readonly ok: false; readonly message: string }
> {
  const existing = await db.query.hrmOffboardingClearanceItem.findFirst({
    where: and(
      eq(hrmOffboardingClearanceItem.organizationId, input.organizationId),
      eq(hrmOffboardingClearanceItem.offboardingInstanceId, input.instanceId),
      eq(hrmOffboardingClearanceItem.itemKey, input.itemKey)
    ),
    columns: { id: true },
  })

  const now = new Date()
  const values = {
    category: input.category,
    employeeId: input.employeeId,
    title: input.title,
    ownerRole: input.ownerRole,
    status: input.status,
    dueAt: input.dueAt ? parseDateOnly(input.dueAt) : null,
    evidenceDocumentId: input.evidenceDocumentId ?? null,
    evidenceNote: input.evidenceNote ?? null,
    blockedReason: input.blockedReason ?? null,
    referenceType: input.referenceType ?? null,
    referenceId: input.referenceId ?? null,
    completedAt: input.status === "completed" ? now : null,
    completedByUserId: input.status === "completed" ? input.actorUserId : null,
    updatedAt: now,
    updatedByUserId: input.actorUserId,
  }

  if (existing) {
    await db
      .update(hrmOffboardingClearanceItem)
      .set(values)
      .where(eq(hrmOffboardingClearanceItem.id, existing.id))
    return { ok: true, itemId: existing.id }
  }

  const [row] = await db
    .insert(hrmOffboardingClearanceItem)
    .values({
      organizationId: input.organizationId,
      offboardingInstanceId: input.instanceId,
      itemKey: input.itemKey,
      createdByUserId: input.actorUserId,
      ...values,
    })
    .returning({ id: hrmOffboardingClearanceItem.id })

  return { ok: true, itemId: row.id }
}

export type { HrmBoardingDbExecutor }
