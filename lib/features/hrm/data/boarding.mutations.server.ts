import "server-only"

import { and, asc, eq, inArray, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBoardingInstance,
  hrmBoardingTask,
  hrmBoardingTemplate,
  hrmBoardingTemplateTask,
  hrmDocument,
  hrmEmployee,
} from "#lib/db/schema"

import type {
  BoardingKind,
  BoardingStatus,
  BoardingTaskStatus,
  BoardingTemplateStatus,
} from "../schemas/boarding.schema"

import {
  defaultBoardingTemplateForKind,
  type BoardingTemplateTaskSeed,
} from "./boarding-defaults.shared"
import {
  deriveBoardingInstanceStatus,
  isOpenBoardingStatus,
} from "./boarding-status.shared"
import {
  selectBestBoardingTemplate,
  type BoardingTemplateCriteria,
} from "./boarding-template-matching.shared"

export type HrmBoardingDbExecutor = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export type BoardingLifecycleCreateResult = {
  readonly created: boolean
  readonly instanceId: string
  readonly taskCount: number
  readonly kind: BoardingKind
  readonly employeeId: string
  readonly contractId: string | null
}

export type BoardingTaskTransitionAction =
  | "start"
  | "complete"
  | "block"
  | "waive"

export type BoardingTaskTransitionResult =
  | {
      ok: true
      taskId: string
      instanceId: string
      kind: BoardingKind
      employeeId: string
      contractId: string | null
      taskKey: string
      taskStatus: BoardingTaskStatus
      instanceStatus: BoardingStatus
    }
  | { ok: false; message: string }

const OPEN_INSTANCE_STATUSES = ["pending", "in_progress", "blocked"] as const

export async function createOnboardingInstanceForContract(
  tx: HrmBoardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly contractId: string
    readonly startDate: Date
    readonly actorUserId: string
    readonly criteria?: BoardingTemplateCriteria
  }
): Promise<BoardingLifecycleCreateResult> {
  return createBoardingInstanceFromTemplate(tx, {
    ...input,
    kind: "onboarding",
  })
}

export async function createOffboardingInstanceForTermination(
  tx: HrmBoardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly contractId: string
    readonly startDate: Date
    readonly actorUserId: string
    readonly criteria?: BoardingTemplateCriteria
  }
): Promise<BoardingLifecycleCreateResult> {
  return createBoardingInstanceFromTemplate(tx, {
    ...input,
    kind: "offboarding",
  })
}

export async function createBoardingTemplateMutation(input: {
  readonly organizationId: string
  readonly kind: BoardingKind
  readonly code: string
  readonly title: string
  readonly description?: string
  readonly status: BoardingTemplateStatus
  readonly actorUserId: string
}): Promise<{ templateId: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmBoardingTemplate).values({
    id,
    organizationId: input.organizationId,
    kind: input.kind,
    code: input.code,
    title: input.title,
    description: input.description ?? null,
    status: input.status,
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  })
  return { templateId: id }
}

export async function updateBoardingTemplateMutation(input: {
  readonly organizationId: string
  readonly templateId: string
  readonly kind: BoardingKind
  readonly code: string
  readonly title: string
  readonly description?: string
  readonly status: BoardingTemplateStatus
  readonly actorUserId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const updated = await db
    .update(hrmBoardingTemplate)
    .set({
      kind: input.kind,
      code: input.code,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      updatedAt: new Date(),
      updatedByUserId: input.actorUserId,
    })
    .where(
      and(
        eq(hrmBoardingTemplate.organizationId, input.organizationId),
        eq(hrmBoardingTemplate.id, input.templateId)
      )
    )
    .returning({ id: hrmBoardingTemplate.id })

  return updated.length === 0
    ? { ok: false, message: "Boarding template not found." }
    : { ok: true }
}

export async function transitionBoardingTask(input: {
  readonly organizationId: string
  readonly taskId: string
  readonly actorUserId: string
  readonly action: BoardingTaskTransitionAction
  readonly note?: string
  readonly waiverReason?: string
  readonly evidenceDocumentId?: string
}): Promise<BoardingTaskTransitionResult> {
  return db.transaction(async (tx) => {
    if (input.evidenceDocumentId) {
      const [doc] = await tx
        .select({ id: hrmDocument.id })
        .from(hrmDocument)
        .where(
          and(
            eq(hrmDocument.organizationId, input.organizationId),
            eq(hrmDocument.id, input.evidenceDocumentId)
          )
        )
        .limit(1)
      if (!doc) {
        return { ok: false, message: "Evidence document not found." }
      }
    }

    const [row] = await tx
      .select({
        taskId: hrmBoardingTask.id,
        taskKey: hrmBoardingTask.taskKey,
        taskStatus: hrmBoardingTask.status,
        instanceId: hrmBoardingInstance.id,
        instanceStatus: hrmBoardingInstance.status,
        kind: hrmBoardingInstance.kind,
        employeeId: hrmBoardingInstance.employeeId,
        contractId: hrmBoardingInstance.contractId,
      })
      .from(hrmBoardingTask)
      .innerJoin(
        hrmBoardingInstance,
        eq(hrmBoardingInstance.id, hrmBoardingTask.instanceId)
      )
      .where(
        and(
          eq(hrmBoardingTask.organizationId, input.organizationId),
          eq(hrmBoardingTask.id, input.taskId)
        )
      )
      .limit(1)

    if (!row) {
      return { ok: false, message: "Boarding task not found." }
    }
    if (!isOpenBoardingStatus(row.instanceStatus)) {
      return { ok: false, message: "Boarding instance is already closed." }
    }
    if (row.taskStatus === "completed" || row.taskStatus === "waived") {
      return { ok: false, message: "Boarding task is already closed." }
    }

    const now = new Date()
    const taskPatch = taskPatchForAction(input.action, {
      actorUserId: input.actorUserId,
      now,
      note: input.note,
      waiverReason: input.waiverReason,
      evidenceDocumentId: input.evidenceDocumentId,
    })
    if (!taskPatch.ok) {
      return { ok: false, message: taskPatch.message }
    }

    await tx
      .update(hrmBoardingTask)
      .set({
        ...taskPatch.patch,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmBoardingTask.organizationId, input.organizationId),
          eq(hrmBoardingTask.id, input.taskId)
        )
      )

    const allTasks = await tx
      .select({
        required: hrmBoardingTask.required,
        status: hrmBoardingTask.status,
      })
      .from(hrmBoardingTask)
      .where(
        and(
          eq(hrmBoardingTask.organizationId, input.organizationId),
          eq(hrmBoardingTask.instanceId, row.instanceId)
        )
      )

    const nextInstanceStatus = deriveBoardingInstanceStatus(allTasks)
    await tx
      .update(hrmBoardingInstance)
      .set({
        status: nextInstanceStatus,
        startedAt:
          row.instanceStatus === "pending" && nextInstanceStatus !== "pending"
            ? now
            : undefined,
        completedAt: nextInstanceStatus === "completed" ? now : undefined,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(
        and(
          eq(hrmBoardingInstance.organizationId, input.organizationId),
          eq(hrmBoardingInstance.id, row.instanceId)
        )
      )

    if (row.kind === "offboarding" && nextInstanceStatus === "completed") {
      await tx
        .update(hrmEmployee)
        .set({
          employmentStatus: "terminated",
          updatedAt: now,
          updatedByUserId: input.actorUserId,
        })
        .where(
          and(
            eq(hrmEmployee.organizationId, input.organizationId),
            eq(hrmEmployee.id, row.employeeId)
          )
        )
    }

    return {
      ok: true,
      taskId: row.taskId,
      instanceId: row.instanceId,
      kind: row.kind === "offboarding" ? "offboarding" : "onboarding",
      employeeId: row.employeeId,
      contractId: row.contractId,
      taskKey: row.taskKey,
      taskStatus: taskPatch.status,
      instanceStatus: nextInstanceStatus,
    }
  })
}

async function createBoardingInstanceFromTemplate(
  tx: HrmBoardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly kind: BoardingKind
    readonly employeeId: string
    readonly contractId: string
    readonly startDate: Date
    readonly actorUserId: string
    readonly criteria?: BoardingTemplateCriteria
  }
): Promise<BoardingLifecycleCreateResult> {
  const [existing] = await tx
    .select({ id: hrmBoardingInstance.id })
    .from(hrmBoardingInstance)
    .where(
      and(
        eq(hrmBoardingInstance.organizationId, input.organizationId),
        eq(hrmBoardingInstance.kind, input.kind),
        eq(hrmBoardingInstance.employeeId, input.employeeId),
        input.contractId
          ? eq(hrmBoardingInstance.contractId, input.contractId)
          : isNull(hrmBoardingInstance.contractId),
        inArray(hrmBoardingInstance.status, [...OPEN_INSTANCE_STATUSES])
      )
    )
    .limit(1)

  if (existing) {
    return {
      created: false,
      instanceId: existing.id,
      taskCount: 0,
      kind: input.kind,
      employeeId: input.employeeId,
      contractId: input.contractId,
    }
  }

  await ensureDefaultBoardingTemplate(tx, {
    organizationId: input.organizationId,
    kind: input.kind,
    actorUserId: input.actorUserId,
  })

  const activeTemplates = await tx
    .select({
      id: hrmBoardingTemplate.id,
      code: hrmBoardingTemplate.code,
      title: hrmBoardingTemplate.title,
      versionNumber: hrmBoardingTemplate.versionNumber,
      appliesTo: hrmBoardingTemplate.appliesTo,
    })
    .from(hrmBoardingTemplate)
    .where(
      and(
        eq(hrmBoardingTemplate.organizationId, input.organizationId),
        eq(hrmBoardingTemplate.kind, input.kind),
        eq(hrmBoardingTemplate.status, "active")
      )
    )

  const template = selectBestBoardingTemplate(
    activeTemplates,
    input.criteria ?? {}
  )
  if (!template) {
    throw new Error(`No active ${input.kind} boarding template matched.`)
  }

  const templateTasks = await tx
    .select()
    .from(hrmBoardingTemplateTask)
    .where(
      and(
        eq(hrmBoardingTemplateTask.organizationId, input.organizationId),
        eq(hrmBoardingTemplateTask.templateId, template.id)
      )
    )
    .orderBy(asc(hrmBoardingTemplateTask.sortOrder))

  if (templateTasks.length === 0) {
    throw new Error(`Active ${input.kind} boarding template has no tasks.`)
  }

  const instanceId = crypto.randomUUID()
  await tx.insert(hrmBoardingInstance).values({
    id: instanceId,
    organizationId: input.organizationId,
    kind: input.kind,
    employeeId: input.employeeId,
    contractId: input.contractId,
    status: "pending",
    templateId: template.id,
    sourceTemplateCode: template.code,
    sourceTemplateVersion: template.versionNumber,
    metadata: { criteria: input.criteria ?? {} },
    createdByUserId: input.actorUserId,
    updatedByUserId: input.actorUserId,
  })

  await tx.insert(hrmBoardingTask).values(
    templateTasks.map((task) => ({
      id: crypto.randomUUID(),
      organizationId: input.organizationId,
      instanceId,
      templateTaskId: task.id,
      taskKey: task.taskKey,
      title: task.title,
      description: task.description,
      status: "pending",
      ownerRole: task.ownerRole,
      ownerUserId: task.ownerUserId,
      dueAt: addUtcDays(input.startDate, task.dueOffsetDays),
      required: task.required,
      category: task.category,
      sortOrder: task.sortOrder,
      metadata: task.metadata,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    }))
  )

  return {
    created: true,
    instanceId,
    taskCount: templateTasks.length,
    kind: input.kind,
    employeeId: input.employeeId,
    contractId: input.contractId,
  }
}

async function ensureDefaultBoardingTemplate(
  tx: HrmBoardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly kind: BoardingKind
    readonly actorUserId: string
  }
) {
  const seed = defaultBoardingTemplateForKind(input.kind)
  const [existing] = await tx
    .select({
      id: hrmBoardingTemplate.id,
      status: hrmBoardingTemplate.status,
    })
    .from(hrmBoardingTemplate)
    .where(
      and(
        eq(hrmBoardingTemplate.organizationId, input.organizationId),
        eq(hrmBoardingTemplate.kind, input.kind),
        eq(hrmBoardingTemplate.code, seed.code)
      )
    )
    .limit(1)

  const templateId = existing?.id ?? crypto.randomUUID()
  if (!existing) {
    await tx.insert(hrmBoardingTemplate).values({
      id: templateId,
      organizationId: input.organizationId,
      kind: input.kind,
      code: seed.code,
      title: seed.title,
      description: seed.description,
      status: "active",
      appliesTo: {},
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
  } else if (existing.status !== "active") {
    await tx
      .update(hrmBoardingTemplate)
      .set({
        status: "active",
        updatedAt: new Date(),
        updatedByUserId: input.actorUserId,
      })
      .where(eq(hrmBoardingTemplate.id, templateId))
  }

  const existingTasks = await tx
    .select({ id: hrmBoardingTemplateTask.id })
    .from(hrmBoardingTemplateTask)
    .where(
      and(
        eq(hrmBoardingTemplateTask.organizationId, input.organizationId),
        eq(hrmBoardingTemplateTask.templateId, templateId)
      )
    )
    .limit(1)

  if (existingTasks.length === 0) {
    await tx
      .insert(hrmBoardingTemplateTask)
      .values(
        seed.tasks.map((task) =>
          templateTaskSeedToInsert(
            input.organizationId,
            templateId,
            task,
            input.actorUserId
          )
        )
      )
  }
}

function templateTaskSeedToInsert(
  organizationId: string,
  templateId: string,
  task: BoardingTemplateTaskSeed,
  actorUserId: string
) {
  return {
    id: crypto.randomUUID(),
    organizationId,
    templateId,
    taskKey: task.taskKey,
    title: task.title,
    description: task.description,
    ownerRole: task.ownerRole,
    dueOffsetDays: task.dueOffsetDays,
    required: task.required,
    category: task.category,
    sortOrder: task.sortOrder,
    createdByUserId: actorUserId,
    updatedByUserId: actorUserId,
  }
}

function taskPatchForAction(
  action: BoardingTaskTransitionAction,
  input: {
    actorUserId: string
    now: Date
    note?: string
    waiverReason?: string
    evidenceDocumentId?: string
  }
):
  | {
      ok: true
      status: BoardingTaskStatus
      patch: Partial<typeof hrmBoardingTask.$inferInsert>
    }
  | { ok: false; message: string } {
  switch (action) {
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
          completedAt: input.now,
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
          blockedAt: input.now,
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
          waivedAt: input.now,
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

function addUtcDays(anchor: Date, days: number): Date {
  return new Date(
    Date.UTC(
      anchor.getUTCFullYear(),
      anchor.getUTCMonth(),
      anchor.getUTCDate() + days
    )
  )
}
