import "server-only"

import { z } from "zod"

import {
  getPlannerItemDetail,
  getPlannerSignalDetail,
  listPlannerHighPressureForNexus,
  listPlannerItemsForQueue,
  listPlannerItemsForTriage,
  listPlannerSignalsForTriage,
  type PlannerPressureRowForNexus,
} from "#features/planner/server"
import type {
  PlannerBlockedState,
  PlannerItemDetail,
  PlannerItemRow,
  PlannerSignalDetail,
  PlannerSignalRow,
} from "#features/planner"

import type { LynxOperatorToolRegistry } from "./operator-tool-registry.server"

const orbitListInputSchema = z.object({
  limit: z.number().int().min(1).max(12).optional(),
})

const orbitItemDetailInputSchema = z.object({
  itemId: z.string().uuid(),
})

const orbitSignalDetailInputSchema = z.object({
  signalId: z.string().uuid(),
})

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null
}

function summarizeBlockedState(
  blockedState: PlannerBlockedState | null | undefined
) {
  if (!blockedState) return null
  return {
    blockedAt: blockedState.blockedAt.toISOString(),
    blockedHours: blockedState.blockedHours,
    thresholdHours: blockedState.thresholdHours,
    stage: blockedState.stage,
  }
}

function summarizeItemRow(row: PlannerItemRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    lifecycle: row.lifecycle,
    displayPriority: row.displayPriority,
    pressureScore: row.pressureScore,
    dueAt: toIso(row.dueAt),
    scheduleStartAt: toIso(row.scheduleStartAt),
    blockedState: summarizeBlockedState(row.blockedState),
    operationalFacts: row.operationalFacts
      ? {
          activeSignalCount: row.operationalFacts.activeSignalCount,
          automationFailureCount: row.operationalFacts.automationFailureCount,
          blockingCount: row.operationalFacts.blockingCount,
          blockedByCount: row.operationalFacts.blockedByCount,
        }
      : null,
  }
}

function summarizeSignalRow(row: PlannerSignalRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    signalClass: row.signalClass,
    lifecycle: row.lifecycle,
    displayPriority: row.displayPriority,
    pressureScore: row.pressureScore,
    detectedAt: row.detectedAt.toISOString(),
    expiresAt: toIso(row.expiresAt),
    originatingSystem: row.originatingSystem,
  }
}

function summarizePressureRow(row: PlannerPressureRowForNexus) {
  return {
    kind: row.kind,
    id: row.id,
    title: row.title,
    description: row.description,
    lifecycle: row.lifecycle,
    signalClass: row.signalClass,
    displayPriority: row.displayPriority,
    pressureScore: row.pressureScore,
    dueAt: toIso(row.dueAt),
    createdAt: row.createdAt.toISOString(),
    blockedState: summarizeBlockedState(row.blockedState),
    operationalFacts: row.operationalFacts
      ? {
          activeSignalCount: row.operationalFacts.activeSignalCount,
          automationFailureCount: row.operationalFacts.automationFailureCount,
          blockingCount: row.operationalFacts.blockingCount,
          blockedByCount: row.operationalFacts.blockedByCount,
        }
      : null,
  }
}

function summarizeItemDetail(detail: PlannerItemDetail) {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description,
    lifecycle: detail.lifecycle,
    displayPriority: detail.displayPriority,
    pressureScore: detail.pressureScore,
    dueAt: toIso(detail.dueAt),
    blockedState: summarizeBlockedState(detail.blockedState),
    assignments: detail.assignments.map((assignment) => ({
      role: assignment.role,
      subjectUserId: assignment.subjectUserId,
      subjectLabel: assignment.subjectLabel,
    })),
    schedule: detail.schedule
      ? {
          scheduledStartAt: toIso(detail.schedule.scheduledStartAt),
          scheduledEndAt: toIso(detail.schedule.scheduledEndAt),
          snoozedUntil: toIso(detail.schedule.snoozedUntil),
        }
      : null,
    reminders: detail.reminders.map((reminder) => ({
      remindAt: reminder.remindAt.toISOString(),
      status: reminder.status,
      snoozedUntil: toIso(reminder.snoozedUntil),
      deliveredAt: toIso(reminder.deliveredAt),
    })),
    recurrence: detail.recurrence
      ? {
          rrule: detail.recurrence.rrule,
          nextRunAt: toIso(detail.recurrence.nextRunAt),
          lastRunAt: toIso(detail.recurrence.lastRunAt),
          pausedAt: toIso(detail.recurrence.pausedAt),
        }
      : null,
    relations: detail.relations.slice(0, 8).map((relation) => ({
      relationType: relation.relationType,
      relatedItemId: relation.relatedItemId,
      relatedItemTitle: relation.relatedItemTitle,
      relatedSignalId: relation.relatedSignalId,
      relatedSignalTitle: relation.relatedSignalTitle,
      relatedSignalLifecycle: relation.relatedSignalLifecycle,
    })),
    links: detail.links.slice(0, 8).map((link) => ({
      module: link.module,
      entityType: link.entityType,
      entityId: link.entityId,
      displayLabel: link.displayLabel,
      href: link.href,
      causalityReason: link.causalityReason,
    })),
    comments: detail.comments.slice(0, 6).map((comment) => ({
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      authorUserId: comment.authorUserId,
    })),
    sessions: detail.sessions.slice(0, 6).map((session) => ({
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      endedAt: toIso(session.endedAt),
      durationMinutes: session.durationMinutes,
      summary: session.summary,
    })),
    notices: detail.notices.slice(0, 6).map((notice) => ({
      title: notice.title,
      severity: notice.severity,
      body: notice.body,
      publishedAt: notice.publishedAt,
      linkedPath: notice.linkedPath,
    })),
    evidenceSummary: detail.evidenceGraph.summary,
  }
}

function summarizeSignalDetail(detail: PlannerSignalDetail) {
  return {
    id: detail.id,
    title: detail.title,
    description: detail.description,
    signalClass: detail.signalClass,
    lifecycle: detail.lifecycle,
    displayPriority: detail.displayPriority,
    pressureScore: detail.pressureScore,
    detectedAt: detail.detectedAt.toISOString(),
    expiresAt: toIso(detail.expiresAt),
    originatingSystem: detail.originatingSystem,
    relatedItems: detail.relatedItems.slice(0, 8).map((relation) => ({
      relationType: relation.relationType,
      relatedItemId: relation.relatedItemId,
      relatedItemTitle: relation.relatedItemTitle,
    })),
    links: detail.links.slice(0, 8).map((link) => ({
      module: link.module,
      entityType: link.entityType,
      entityId: link.entityId,
      displayLabel: link.displayLabel,
      href: link.href,
      causalityReason: link.causalityReason,
    })),
    activity: detail.activity.slice(0, 8).map((row) => ({
      activityType: row.activityType,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
    })),
    evidenceSummary: detail.evidenceGraph.summary,
  }
}

export function createLynxOrbitOperatorTools(
  organizationId: string
): LynxOperatorToolRegistry {
  const scope = { scopeKind: "organization" as const, organizationId }

  return [
    {
      id: "org_orbit_high_pressure",
      description:
        "Returns the highest-pressure Orbit items and signals for this organization. Use when the user asks what needs attention now.",
      risk: "low",
      category: "operations",
      access: "read",
      dataSensitivity: "medium",
      audit: "record",
      schema: orbitListInputSchema,
      execute: async (input: unknown) => {
        const { limit: rawLimit } = orbitListInputSchema.parse(input)
        const limit = rawLimit ?? 5
        const rows = await listPlannerHighPressureForNexus(
          organizationId,
          limit
        )
        return {
          records: rows.map(summarizePressureRow),
        }
      },
    },
    {
      id: "org_orbit_triage_snapshot",
      description:
        "Returns a triage snapshot for this organization's Orbit surface: pending triage items and incoming signals. Use when the user asks what should be triaged or promoted next.",
      risk: "low",
      category: "operations",
      access: "read",
      dataSensitivity: "medium",
      audit: "record",
      schema: orbitListInputSchema,
      execute: async (input: unknown) => {
        const { limit: rawLimit } = orbitListInputSchema.parse(input)
        const limit = rawLimit ?? 5
        const [items, signals] = await Promise.all([
          listPlannerItemsForTriage(scope),
          listPlannerSignalsForTriage(scope),
        ])
        return {
          totalItems: items.length,
          totalSignals: signals.length,
          items: items.slice(0, limit).map(summarizeItemRow),
          signals: signals.slice(0, limit).map(summarizeSignalRow),
        }
      },
    },
    {
      id: "org_orbit_blocked_items",
      description:
        "Returns blocked Orbit items for this organization, including blocked duration and operational facts. Use when the user asks what is stuck or needs recovery.",
      risk: "low",
      category: "operations",
      access: "read",
      dataSensitivity: "medium",
      audit: "record",
      schema: orbitListInputSchema,
      execute: async (input: unknown) => {
        const { limit: rawLimit } = orbitListInputSchema.parse(input)
        const limit = rawLimit ?? 5
        const rows = await listPlannerItemsForQueue(
          scope,
          { lifecycle: ["blocked"] },
          null
        )
        return {
          totalBlocked: rows.length,
          items: rows.slice(0, limit).map(summarizeItemRow),
        }
      },
    },
    {
      id: "org_orbit_item_detail",
      description:
        "Returns a detailed Orbit item snapshot by id, including ownership, schedule, links, notices, and evidence summary. Use only after you already have a specific Orbit item id.",
      risk: "low",
      category: "operations",
      access: "read",
      dataSensitivity: "medium",
      audit: "record",
      schema: orbitItemDetailInputSchema,
      execute: async (input: unknown) => {
        const { itemId } = orbitItemDetailInputSchema.parse(input)
        const detail = await getPlannerItemDetail(scope, itemId)
        return {
          found: detail != null,
          item: detail ? summarizeItemDetail(detail) : null,
        }
      },
    },
    {
      id: "org_orbit_signal_detail",
      description:
        "Returns a detailed Orbit signal snapshot by id, including related items, ERP links, activity, and evidence summary. Use only after you already have a specific Orbit signal id.",
      risk: "low",
      category: "operations",
      access: "read",
      dataSensitivity: "medium",
      audit: "record",
      schema: orbitSignalDetailInputSchema,
      execute: async (input: unknown) => {
        const { signalId } = orbitSignalDetailInputSchema.parse(input)
        const detail = await getPlannerSignalDetail(scope, signalId)
        return {
          found: detail != null,
          signal: detail ? summarizeSignalDetail(detail) : null,
        }
      },
    },
  ]
}
