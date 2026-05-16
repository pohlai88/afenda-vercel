import "server-only"

import { and, asc, count, desc, eq, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmBoardingInstance,
  hrmBoardingTask,
  hrmEmployee,
  hrmEmploymentContract,
} from "#lib/db/schema"

import type {
  BoardingKind,
  BoardingTaskCategory,
  BoardingTaskStatus,
} from "../schemas/boarding.schema"

const OPEN_INSTANCE_STATUSES = ["pending", "in_progress", "blocked"] as const
const OPEN_TASK_STATUSES = ["pending", "in_progress", "blocked"] as const

export type BoardingTaskRow = {
  id: string
  taskKey: string
  title: string
  description: string | null
  status: BoardingTaskStatus | string
  ownerRole: string | null
  ownerUserId: string | null
  dueAt: string | null
  required: boolean
  category: BoardingTaskCategory | string
  blockedReason: string | null
  evidenceDocumentId: string | null
  completedAt: Date | null
  waivedAt: Date | null
  waiverReason: string | null
  sortOrder: number
}

export type BoardingInstanceRow = {
  id: string
  kind: BoardingKind
  status: string
  employeeId: string
  employeeNumber: string
  legalName: string
  contractId: string | null
  contractVersionNumber: number | null
  startedAt: Date | null
  completedAt: Date | null
  createdAt: Date
  updatedAt: Date
  tasks: BoardingTaskRow[]
  requiredTaskCount: number
  completedRequiredTaskCount: number
  blockedTaskCount: number
  overdueTaskCount: number
}

export type BoardingPressureAggregate = {
  blockedCount: number
  overdueCount: number
}

export async function listBoardingInstancesForDashboard(
  organizationId: string,
  kind: BoardingKind
): Promise<BoardingInstanceRow[]> {
  const instances = await db
    .select({
      id: hrmBoardingInstance.id,
      kind: hrmBoardingInstance.kind,
      status: hrmBoardingInstance.status,
      employeeId: hrmBoardingInstance.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      contractId: hrmBoardingInstance.contractId,
      contractVersionNumber: hrmEmploymentContract.versionNumber,
      startedAt: hrmBoardingInstance.startedAt,
      completedAt: hrmBoardingInstance.completedAt,
      createdAt: hrmBoardingInstance.createdAt,
      updatedAt: hrmBoardingInstance.updatedAt,
    })
    .from(hrmBoardingInstance)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmBoardingInstance.employeeId))
    .leftJoin(
      hrmEmploymentContract,
      eq(hrmEmploymentContract.id, hrmBoardingInstance.contractId)
    )
    .where(
      and(
        eq(hrmBoardingInstance.organizationId, organizationId),
        eq(hrmBoardingInstance.kind, kind)
      )
    )
    .orderBy(desc(hrmBoardingInstance.updatedAt))
    .limit(100)

  return attachTasks(organizationId, instances)
}

export async function listOpenBoardingInstancesForEmployee(
  organizationId: string,
  employeeId: string
): Promise<BoardingInstanceRow[]> {
  const instances = await db
    .select({
      id: hrmBoardingInstance.id,
      kind: hrmBoardingInstance.kind,
      status: hrmBoardingInstance.status,
      employeeId: hrmBoardingInstance.employeeId,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      contractId: hrmBoardingInstance.contractId,
      contractVersionNumber: hrmEmploymentContract.versionNumber,
      startedAt: hrmBoardingInstance.startedAt,
      completedAt: hrmBoardingInstance.completedAt,
      createdAt: hrmBoardingInstance.createdAt,
      updatedAt: hrmBoardingInstance.updatedAt,
    })
    .from(hrmBoardingInstance)
    .innerJoin(hrmEmployee, eq(hrmEmployee.id, hrmBoardingInstance.employeeId))
    .leftJoin(
      hrmEmploymentContract,
      eq(hrmEmploymentContract.id, hrmBoardingInstance.contractId)
    )
    .where(
      and(
        eq(hrmBoardingInstance.organizationId, organizationId),
        eq(hrmBoardingInstance.employeeId, employeeId),
        inArray(hrmBoardingInstance.status, [...OPEN_INSTANCE_STATUSES])
      )
    )
    .orderBy(desc(hrmBoardingInstance.updatedAt))

  return attachTasks(organizationId, instances)
}

export async function getBoardingPressureAggregateForOrg(
  organizationId: string,
  kind: BoardingKind,
  now: Date
): Promise<BoardingPressureAggregate> {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const [blockedRow, overdueRow] = await Promise.all([
    db
      .select({ n: count(hrmBoardingTask.id) })
      .from(hrmBoardingTask)
      .innerJoin(
        hrmBoardingInstance,
        eq(hrmBoardingInstance.id, hrmBoardingTask.instanceId)
      )
      .where(
        and(
          eq(hrmBoardingTask.organizationId, organizationId),
          eq(hrmBoardingInstance.kind, kind),
          eq(hrmBoardingTask.status, "blocked")
        )
      )
      .then((rows) => Number(rows[0]?.n ?? 0)),
    db
      .select({ n: count(hrmBoardingTask.id) })
      .from(hrmBoardingTask)
      .innerJoin(
        hrmBoardingInstance,
        eq(hrmBoardingInstance.id, hrmBoardingTask.instanceId)
      )
      .where(
        and(
          eq(hrmBoardingTask.organizationId, organizationId),
          eq(hrmBoardingInstance.kind, kind),
          inArray(hrmBoardingTask.status, [...OPEN_TASK_STATUSES]),
          lte(hrmBoardingTask.dueAt, today)
        )
      )
      .then((rows) => Number(rows[0]?.n ?? 0)),
  ])

  return { blockedCount: blockedRow, overdueCount: overdueRow }
}

async function attachTasks(
  organizationId: string,
  instances: Array<{
    id: string
    kind: string
    status: string
    employeeId: string
    employeeNumber: string
    legalName: string
    contractId: string | null
    contractVersionNumber: number | null
    startedAt: Date | null
    completedAt: Date | null
    createdAt: Date
    updatedAt: Date
  }>
): Promise<BoardingInstanceRow[]> {
  if (instances.length === 0) {
    return []
  }

  const now = new Date()
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const ids = instances.map((instance) => instance.id)
  const tasks = await db
    .select({
      id: hrmBoardingTask.id,
      instanceId: hrmBoardingTask.instanceId,
      taskKey: hrmBoardingTask.taskKey,
      title: hrmBoardingTask.title,
      description: hrmBoardingTask.description,
      status: hrmBoardingTask.status,
      ownerRole: hrmBoardingTask.ownerRole,
      ownerUserId: hrmBoardingTask.ownerUserId,
      dueAt: hrmBoardingTask.dueAt,
      required: hrmBoardingTask.required,
      category: hrmBoardingTask.category,
      blockedReason: hrmBoardingTask.blockedReason,
      evidenceDocumentId: hrmBoardingTask.evidenceDocumentId,
      completedAt: hrmBoardingTask.completedAt,
      waivedAt: hrmBoardingTask.waivedAt,
      waiverReason: hrmBoardingTask.waiverReason,
      sortOrder: hrmBoardingTask.sortOrder,
    })
    .from(hrmBoardingTask)
    .where(
      and(
        eq(hrmBoardingTask.organizationId, organizationId),
        inArray(hrmBoardingTask.instanceId, ids)
      )
    )
    .orderBy(asc(hrmBoardingTask.sortOrder), asc(hrmBoardingTask.createdAt))

  const byInstance = new Map<string, BoardingTaskRow[]>()
  for (const task of tasks) {
    const list = byInstance.get(task.instanceId) ?? []
    list.push({
      id: task.id,
      taskKey: task.taskKey,
      title: task.title,
      description: task.description,
      status: task.status,
      ownerRole: task.ownerRole,
      ownerUserId: task.ownerUserId,
      dueAt: task.dueAt ? task.dueAt.toISOString().slice(0, 10) : null,
      required: task.required,
      category: task.category,
      blockedReason: task.blockedReason,
      evidenceDocumentId: task.evidenceDocumentId,
      completedAt: task.completedAt,
      waivedAt: task.waivedAt,
      waiverReason: task.waiverReason,
      sortOrder: task.sortOrder,
    })
    byInstance.set(task.instanceId, list)
  }

  return instances.map((instance) => {
    const instanceTasks = byInstance.get(instance.id) ?? []
    const requiredTasks = instanceTasks.filter((task) => task.required)
    const completedRequired = requiredTasks.filter(
      (task) => task.status === "completed" || task.status === "waived"
    )
    const blockedTaskCount = instanceTasks.filter(
      (task) => task.status === "blocked"
    ).length
    const overdueTaskCount = instanceTasks.filter((task) => {
      if (!task.dueAt) return false
      if (!OPEN_TASK_STATUSES.includes(task.status as never)) return false
      return (
        new Date(`${task.dueAt}T00:00:00.000Z`).getTime() <= today.getTime()
      )
    }).length

    return {
      ...instance,
      kind: instance.kind === "offboarding" ? "offboarding" : "onboarding",
      tasks: instanceTasks,
      requiredTaskCount: requiredTasks.length,
      completedRequiredTaskCount: completedRequired.length,
      blockedTaskCount,
      overdueTaskCount,
    }
  })
}
