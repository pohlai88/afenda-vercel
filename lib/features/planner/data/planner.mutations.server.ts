import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  plannerActivity,
  plannerAssignment,
  plannerAttachment,
  plannerComment,
  plannerItem,
  plannerLink,
  plannerRelation,
  plannerRecurrence,
  plannerReminder,
  plannerSchedule,
  plannerSession,
  plannerSignal,
  plannerView,
} from "#lib/db/schema"

import { normalizePlannerViewFilterState } from "../filters/planner-view-filter.shared"
import { normalizePlannerPressure } from "../pressure/planner-pressure.shared"
import { nextPlannerRunFromRecurrence } from "../recurrence/planner-recurrence.shared"
import { inversePlannerRelation } from "../relations/planner-relation.shared"
import { canTransitionPlannerSignalLifecycle } from "../signals/planner-signal.shared"
import { calculatePlannerSessionMinutes } from "../worklog/planner-session.shared"
import type {
  PlannerItemLifecycle,
  PlannerOwnershipRole,
  PlannerPressureDimensions,
  PlannerScopeInput,
  PlannerSignalClass,
  PlannerSignalLifecycle,
  PlannerViewRow,
} from "../types"

function scopeValues(scope: PlannerScopeInput) {
  return scope.scopeKind === "organization"
    ? { organizationId: scope.organizationId, ownerUserId: null }
    : { organizationId: null, ownerUserId: scope.ownerUserId }
}

function trimToNull(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function slugifyPlannerViewName(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)

  return slug || "view"
}

function scopedItemWhere(scope: PlannerScopeInput, itemId: string) {
  return and(
    eq(plannerItem.id, itemId),
    scope.scopeKind === "organization"
      ? eq(plannerItem.organizationId, scope.organizationId)
      : eq(plannerItem.ownerUserId, scope.ownerUserId)
  )
}

function scopedSignalWhere(scope: PlannerScopeInput, signalId: string) {
  return and(
    eq(plannerSignal.id, signalId),
    scope.scopeKind === "organization"
      ? eq(plannerSignal.organizationId, scope.organizationId)
      : eq(plannerSignal.ownerUserId, scope.ownerUserId)
  )
}

async function getScopedItemOrThrow(
  scope: PlannerScopeInput,
  itemId: string
): Promise<typeof plannerItem.$inferSelect> {
  const [itemRow] = await db
    .select()
    .from(plannerItem)
    .where(scopedItemWhere(scope, itemId))
    .limit(1)

  if (!itemRow) {
    throw new Error("Item not found")
  }

  return itemRow
}

async function getScopedSignalOrThrow(
  scope: PlannerScopeInput,
  signalId: string
): Promise<typeof plannerSignal.$inferSelect> {
  const [signalRow] = await db
    .select()
    .from(plannerSignal)
    .where(scopedSignalWhere(scope, signalId))
    .limit(1)

  if (!signalRow) {
    throw new Error("Signal not found")
  }

  return signalRow
}

async function findPlannerRelation(input: {
  itemId: string
  relatedItemId?: string | null
  relatedSignalId?: string | null
  relationType: string
}) {
  const [row] = await db
    .select({ id: plannerRelation.id })
    .from(plannerRelation)
    .where(
      and(
        eq(plannerRelation.itemId, input.itemId),
        eq(plannerRelation.relationType, input.relationType),
        input.relatedItemId
          ? eq(plannerRelation.relatedItemId, input.relatedItemId)
          : undefined,
        input.relatedSignalId
          ? eq(plannerRelation.relatedSignalId, input.relatedSignalId)
          : undefined
      )
    )
    .limit(1)

  return row ?? null
}

export async function insertPlannerSignal(input: {
  scope: PlannerScopeInput
  title: string
  description?: string
  signalClass: PlannerSignalClass
  actorUserId: string
  originatingSystem?: string | null
  pressure?: Partial<PlannerPressureDimensions>
}): Promise<{ id: string }> {
  const pressure = normalizePlannerPressure(input.pressure)
  const [row] = await db
    .insert(plannerSignal)
    .values({
      ...scopeValues(input.scope),
      title: input.title,
      description: trimToNull(input.description),
      signalClass: input.signalClass,
      lifecycle: "detected",
      detectedAt: new Date(),
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      originatingSystem: input.originatingSystem ?? null,
      ...pressure,
    })
    .returning({ id: plannerSignal.id })

  await db.insert(plannerActivity).values({
    signalId: row.id,
    activityType: "signal_created",
    body: "Signal captured into Orbit.",
    authorUserId: input.actorUserId,
  })

  return row
}

export async function insertPlannerItem(input: {
  scope: PlannerScopeInput
  title: string
  description?: string
  dueAt?: Date | null
  actorUserId: string
  pressure?: Partial<PlannerPressureDimensions>
  sourceSignalId?: string | null
}): Promise<{ id: string }> {
  const pressure = normalizePlannerPressure(input.pressure)
  const [row] = await db
    .insert(plannerItem)
    .values({
      ...scopeValues(input.scope),
      title: input.title,
      description: trimToNull(input.description),
      lifecycle: "triaged",
      dueAt: input.dueAt ?? null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
      sourceSignalId: input.sourceSignalId ?? null,
      ...pressure,
    })
    .returning({ id: plannerItem.id })

  await db.insert(plannerActivity).values({
    itemId: row.id,
    activityType: "item_created",
    body: "Execution item created in Orbit.",
    authorUserId: input.actorUserId,
  })

  return row
}

export async function promotePlannerSignalToItem(input: {
  scope: PlannerScopeInput
  signalId: string
  actorUserId: string
}): Promise<{ itemId: string }> {
  return db.transaction(async (tx) => {
    const [signalRow] = await tx
      .select()
      .from(plannerSignal)
      .where(scopedSignalWhere(input.scope, input.signalId))
      .limit(1)

    if (!signalRow) {
      throw new Error("Signal not found")
    }

    const [itemRow] = await tx
      .insert(plannerItem)
      .values({
        ...scopeValues(input.scope),
        title: signalRow.title,
        description: signalRow.description,
        lifecycle: "triaged",
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
        sourceSignalId: signalRow.id,
        urgency: signalRow.urgency,
        impact: signalRow.impact,
        severity: signalRow.severity,
        confidence: signalRow.confidence,
        effort: signalRow.effort,
        escalationLevel: signalRow.escalationLevel,
        temporalProximity: signalRow.temporalProximity,
        ownershipPressure: signalRow.ownershipPressure,
        temporalPast: signalRow.temporalPast,
        temporalNow: signalRow.temporalNow,
        temporalNext: signalRow.temporalNext,
      })
      .returning({ id: plannerItem.id })

    await tx
      .update(plannerSignal)
      .set({
        lifecycle: "promoted",
        promotedAt: new Date(),
        updatedByUserId: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(eq(plannerSignal.id, signalRow.id))

    await tx.insert(plannerActivity).values([
      {
        signalId: signalRow.id,
        activityType: "signal_promoted",
        body: `Signal promoted to item ${itemRow.id}.`,
        authorUserId: input.actorUserId,
      },
      {
        itemId: itemRow.id,
        activityType: "item_promoted_from_signal",
        body: `Execution item promoted from signal ${signalRow.id}.`,
        authorUserId: input.actorUserId,
      },
    ])

    return { itemId: itemRow.id }
  })
}

export async function transitionPlannerSignalLifecycle(input: {
  scope: PlannerScopeInput
  signalId: string
  lifecycle: PlannerSignalLifecycle
  actorUserId: string
}): Promise<void> {
  const signalRow = await getScopedSignalOrThrow(input.scope, input.signalId)

  if (!canTransitionPlannerSignalLifecycle(signalRow.lifecycle as PlannerSignalLifecycle, input.lifecycle)) {
    throw new Error("Signal lifecycle transition is not allowed")
  }

  const timestamp = new Date()

  await db
    .update(plannerSignal)
    .set({
      lifecycle: input.lifecycle,
      updatedAt: timestamp,
      updatedByUserId: input.actorUserId,
      promotedAt: input.lifecycle === "promoted" ? timestamp : signalRow.promotedAt,
    })
    .where(eq(plannerSignal.id, input.signalId))

  await db.insert(plannerActivity).values({
    signalId: input.signalId,
    activityType: "signal_lifecycle_transition",
    body: `Signal moved to ${input.lifecycle}.`,
    authorUserId: input.actorUserId,
  })
}

export async function transitionPlannerItemLifecycle(input: {
  scope: PlannerScopeInput
  itemId: string
  lifecycle: PlannerItemLifecycle
  actorUserId: string
}): Promise<void> {
  const timestamp = new Date()
  const patch: Partial<typeof plannerItem.$inferInsert> = {
    lifecycle: input.lifecycle,
    updatedByUserId: input.actorUserId,
    updatedAt: timestamp,
  }

  if (input.lifecycle === "resolved") patch.resolvedAt = timestamp
  if (input.lifecycle === "scheduled") patch.scheduleStartAt ??= timestamp
  if (input.lifecycle === "verified") patch.verifiedAt = timestamp
  if (input.lifecycle === "cancelled") patch.cancelledAt = timestamp
  if (input.lifecycle === "deprecated") patch.deprecatedAt = timestamp
  if (input.lifecycle === "blocked") patch.blockedAt = timestamp

  await getScopedItemOrThrow(input.scope, input.itemId)

  await db
    .update(plannerItem)
    .set(patch)
    .where(scopedItemWhere(input.scope, input.itemId))

  await db.insert(plannerActivity).values({
    itemId: input.itemId,
    activityType: "item_lifecycle_transition",
    body: `Execution item moved to ${input.lifecycle}.`,
    authorUserId: input.actorUserId,
  })
}

export async function schedulePlannerItem(input: {
  scope: PlannerScopeInput
  itemId: string
  scheduleStartAt: Date | null
  scheduledEndAt: Date | null
  dueAt: Date | null
  snoozedUntil: Date | null
  timeZone?: string | null
  actorUserId: string
}): Promise<void> {
  const itemRow = await getScopedItemOrThrow(input.scope, input.itemId)

  const now = new Date()
  const timeZone = trimToNull(input.timeZone)

  await db.transaction(async (tx) => {
    const [existingSchedule] = await tx
      .select()
      .from(plannerSchedule)
      .where(eq(plannerSchedule.itemId, input.itemId))
      .limit(1)

    if (existingSchedule) {
      await tx
        .update(plannerSchedule)
        .set({
          scheduledStartAt: input.scheduleStartAt,
          scheduledEndAt: input.scheduledEndAt,
          snoozedUntil: input.snoozedUntil,
          timeZone,
          updatedAt: now,
        })
        .where(eq(plannerSchedule.id, existingSchedule.id))
    } else {
      await tx.insert(plannerSchedule).values({
        itemId: input.itemId,
        scheduledStartAt: input.scheduleStartAt,
        scheduledEndAt: input.scheduledEndAt,
        snoozedUntil: input.snoozedUntil,
        timeZone,
      })
    }

    await tx
      .update(plannerItem)
      .set({
        lifecycle:
          input.scheduleStartAt &&
          (itemRow.lifecycle === "triaged" || itemRow.lifecycle === "assigned")
            ? "scheduled"
            : itemRow.lifecycle,
        scheduleStartAt: input.scheduleStartAt,
        endAt: input.scheduledEndAt,
        dueAt: input.dueAt,
        updatedAt: now,
        updatedByUserId: input.actorUserId,
      })
      .where(eq(plannerItem.id, input.itemId))

    await tx.insert(plannerActivity).values({
      itemId: input.itemId,
      activityType: "schedule_updated",
      body: "Execution schedule updated.",
      authorUserId: input.actorUserId,
    })
  })
}

export async function upsertPlannerReminder(input: {
  scope: PlannerScopeInput
  itemId: string
  remindAt: Date
  snoozedUntil: Date | null
  actorUserId: string
}): Promise<{ reminderId: string }> {
  await getScopedItemOrThrow(input.scope, input.itemId)

  const now = new Date()

  return db.transaction(async (tx) => {
    const [existingReminder] = await tx
      .select()
      .from(plannerReminder)
      .where(eq(plannerReminder.itemId, input.itemId))
      .orderBy(desc(plannerReminder.createdAt))
      .limit(1)

    if (existingReminder) {
      const [updated] = await tx
        .update(plannerReminder)
        .set({
          remindAt: input.remindAt,
          snoozedUntil: input.snoozedUntil,
          deliveredAt: null,
          status: "pending",
          updatedAt: now,
        })
        .where(eq(plannerReminder.id, existingReminder.id))
        .returning({ reminderId: plannerReminder.id })

      await tx.insert(plannerActivity).values({
        itemId: input.itemId,
        activityType: "reminder_updated",
        body: "Reminder schedule updated.",
        authorUserId: input.actorUserId,
      })

      return updated
    }

    const [created] = await tx
      .insert(plannerReminder)
      .values({
        itemId: input.itemId,
        remindAt: input.remindAt,
        snoozedUntil: input.snoozedUntil,
      })
      .returning({ reminderId: plannerReminder.id })

    await tx.insert(plannerActivity).values({
      itemId: input.itemId,
      activityType: "reminder_created",
      body: "Reminder scheduled.",
      authorUserId: input.actorUserId,
    })

    return created
  })
}

export async function upsertPlannerRecurrence(input: {
  scope: PlannerScopeInput
  itemId: string
  rrule: string
  timeZone?: string | null
  nextRunAt?: Date | null
  actorUserId: string
}): Promise<{ recurrenceId: string }> {
  const itemRow = await getScopedItemOrThrow(input.scope, input.itemId)
  const now = new Date()
  const nextRunAt =
    input.nextRunAt ??
    nextPlannerRunFromRecurrence(input.rrule, itemRow.dueAt ?? now)
  const timeZone = trimToNull(input.timeZone)

  return db.transaction(async (tx) => {
    const [existingRecurrence] = await tx
      .select()
      .from(plannerRecurrence)
      .where(eq(plannerRecurrence.itemId, input.itemId))
      .limit(1)

    if (existingRecurrence) {
      const [updated] = await tx
        .update(plannerRecurrence)
        .set({
          rrule: input.rrule,
          timeZone,
          nextRunAt,
          updatedAt: now,
        })
        .where(eq(plannerRecurrence.id, existingRecurrence.id))
        .returning({ recurrenceId: plannerRecurrence.id })

      await tx.insert(plannerActivity).values({
        itemId: input.itemId,
        activityType: "recurrence_updated",
        body: "Recurrence updated.",
        authorUserId: input.actorUserId,
      })

      return updated
    }

    const [created] = await tx
      .insert(plannerRecurrence)
      .values({
        itemId: input.itemId,
        rrule: input.rrule,
        timeZone,
        nextRunAt,
      })
      .returning({ recurrenceId: plannerRecurrence.id })

    await tx.insert(plannerActivity).values({
      itemId: input.itemId,
      activityType: "recurrence_created",
      body: "Recurrence scheduled.",
      authorUserId: input.actorUserId,
    })

    return created
  })
}

export async function assignPlannerOwnership(input: {
  scope: PlannerScopeInput
  itemId: string
  role: PlannerOwnershipRole
  subjectUserId?: string | null
  subjectLabel?: string | null
  actorUserId: string
}): Promise<void> {
  const itemRow = await getScopedItemOrThrow(input.scope, input.itemId)

  await db.transaction(async (tx) => {
    await tx
      .delete(plannerAssignment)
      .where(
        and(
          eq(plannerAssignment.itemId, input.itemId),
          eq(plannerAssignment.role, input.role)
        )
      )

    await tx.insert(plannerAssignment).values({
      itemId: input.itemId,
      role: input.role,
      subjectUserId: trimToNull(input.subjectUserId),
      subjectLabel: trimToNull(input.subjectLabel),
      createdByUserId: input.actorUserId,
    })

    if (input.role === "assignee" && itemRow.lifecycle === "triaged") {
      await tx
        .update(plannerItem)
        .set({
          lifecycle: "assigned",
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(plannerItem.id, input.itemId))
    }

    await tx.insert(plannerActivity).values({
      itemId: input.itemId,
      activityType: "assignment_updated",
      body: `${input.role} assignment updated.`,
      authorUserId: input.actorUserId,
    })
  })
}

export async function createPlannerLink(input: {
  scope: PlannerScopeInput
  itemId: string
  module: string
  entityType: string
  entityId: string
  displayLabel: string
  href?: string | null
  causalityReason?: string | null
  actorUserId: string
}): Promise<{ linkId: string }> {
  await getScopedItemOrThrow(input.scope, input.itemId)

  const [linkRow] = await db
    .insert(plannerLink)
    .values({
      ...scopeValues(input.scope),
      itemId: input.itemId,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      displayLabel: input.displayLabel,
      href: trimToNull(input.href),
      causalityReason: trimToNull(input.causalityReason),
    })
    .returning({ linkId: plannerLink.id })

  await db.insert(plannerActivity).values({
    itemId: input.itemId,
    activityType: "erp_link_created",
    body: `ERP link created for ${input.displayLabel}.`,
    authorUserId: input.actorUserId,
  })

  return linkRow
}

export async function createPlannerSignalLink(input: {
  scope: PlannerScopeInput
  signalId: string
  module: string
  entityType: string
  entityId: string
  displayLabel: string
  href?: string | null
  causalityReason?: string | null
  actorUserId: string
}): Promise<{ linkId: string }> {
  await getScopedSignalOrThrow(input.scope, input.signalId)

  const [linkRow] = await db
    .insert(plannerLink)
    .values({
      ...scopeValues(input.scope),
      signalId: input.signalId,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      displayLabel: input.displayLabel,
      href: trimToNull(input.href),
      causalityReason: trimToNull(input.causalityReason),
    })
    .returning({ linkId: plannerLink.id })

  await db.insert(plannerActivity).values({
    signalId: input.signalId,
    activityType: "erp_link_created",
    body: `ERP link created for ${input.displayLabel}.`,
    authorUserId: input.actorUserId,
  })

  return linkRow
}

export async function createPlannerRelation(input: {
  scope: PlannerScopeInput
  itemId: string
  relationType: "parent" | "subtask" | "blocks" | "blocked_by" | "duplicate" | "related"
  relatedItemId?: string | null
  relatedSignalId?: string | null
  actorUserId: string
}): Promise<{ relationId: string }> {
  const primaryItem = await getScopedItemOrThrow(input.scope, input.itemId)

  if ((input.relatedItemId ? 1 : 0) + (input.relatedSignalId ? 1 : 0) !== 1) {
    throw new Error("Exactly one related target is required")
  }

  if (input.relatedItemId) {
    const relatedItem = await getScopedItemOrThrow(input.scope, input.relatedItemId)

    if (input.relatedItemId === input.itemId) {
      throw new Error("An item cannot relate to itself")
    }

    return db.transaction(async (tx) => {
      const existing = await findPlannerRelation({
        itemId: input.itemId,
        relatedItemId: input.relatedItemId,
        relationType: input.relationType,
      })

      const inverseType = inversePlannerRelation(input.relationType)
      const inverseExisting = await findPlannerRelation({
        itemId: input.relatedItemId!,
        relatedItemId: input.itemId,
        relationType: inverseType,
      })

      const relationId =
        existing?.id ??
        (
          await tx
            .insert(plannerRelation)
            .values({
              itemId: input.itemId,
              relatedItemId: input.relatedItemId,
              relationType: input.relationType,
            })
            .returning({ id: plannerRelation.id })
        )[0]!.id

      if (!inverseExisting) {
        await tx.insert(plannerRelation).values({
          itemId: input.relatedItemId!,
          relatedItemId: input.itemId,
          relationType: inverseType,
        })
      }

      await tx.insert(plannerActivity).values([
        {
          itemId: input.itemId,
          activityType: "relation_created",
          body: `Relation ${input.relationType} linked to ${input.relatedItemId}.`,
          authorUserId: input.actorUserId,
        },
        {
          itemId: input.relatedItemId!,
          activityType: "relation_created",
          body: `Relation ${inverseType} linked to ${input.itemId}.`,
          authorUserId: input.actorUserId,
        },
      ])

      if (input.relationType === "blocks" && relatedItem.lifecycle !== "blocked") {
        await tx
          .update(plannerItem)
          .set({
            lifecycle: "blocked",
            blockedAt: new Date(),
            updatedAt: new Date(),
            updatedByUserId: input.actorUserId,
          })
          .where(eq(plannerItem.id, input.relatedItemId!))
      }

      if (
        input.relationType === "blocked_by" &&
        primaryItem.lifecycle !== "blocked"
      ) {
        await tx
          .update(plannerItem)
          .set({
            lifecycle: "blocked",
            blockedAt: new Date(),
            updatedAt: new Date(),
            updatedByUserId: input.actorUserId,
          })
          .where(eq(plannerItem.id, input.itemId))
      }

      return { relationId }
    })
  }

  await getScopedSignalOrThrow(input.scope, input.relatedSignalId!)

  return db.transaction(async (tx) => {
    const existing = await findPlannerRelation({
      itemId: input.itemId,
      relatedSignalId: input.relatedSignalId!,
      relationType: input.relationType,
    })

    const relationId =
      existing?.id ??
      (
        await tx
          .insert(plannerRelation)
          .values({
            itemId: input.itemId,
            relatedSignalId: input.relatedSignalId!,
            relationType: input.relationType,
          })
          .returning({ id: plannerRelation.id })
      )[0]!.id

    await tx.insert(plannerActivity).values([
      {
        itemId: input.itemId,
        activityType: "relation_created",
        body: `Relation ${input.relationType} linked to signal ${input.relatedSignalId}.`,
        authorUserId: input.actorUserId,
      },
      {
        signalId: input.relatedSignalId!,
        activityType: "relation_created",
        body: `Signal linked to item ${input.itemId}.`,
        authorUserId: input.actorUserId,
      },
    ])

    return { relationId }
  })
}

export async function correlatePlannerSignalToExistingItem(input: {
  scope: PlannerScopeInput
  signalId: string
  itemId: string
  actorUserId: string
}): Promise<{ relationId: string }> {
  await getScopedItemOrThrow(input.scope, input.itemId)
  const signalRow = await getScopedSignalOrThrow(input.scope, input.signalId)

  if (
    !canTransitionPlannerSignalLifecycle(
      signalRow.lifecycle as PlannerSignalLifecycle,
      "correlated"
    ) &&
    signalRow.lifecycle !== "correlated"
  ) {
    throw new Error("Signal lifecycle transition is not allowed")
  }

  return db.transaction(async (tx) => {
    const existing = await findPlannerRelation({
      itemId: input.itemId,
      relatedSignalId: input.signalId,
      relationType: "related",
    })

    const relationId =
      existing?.id ??
      (
        await tx
          .insert(plannerRelation)
          .values({
            itemId: input.itemId,
            relatedSignalId: input.signalId,
            relationType: "related",
          })
          .returning({ id: plannerRelation.id })
      )[0]!.id

    if (signalRow.lifecycle !== "correlated") {
      await tx
        .update(plannerSignal)
        .set({
          lifecycle: "correlated",
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(plannerSignal.id, input.signalId))
    }

    await tx.insert(plannerActivity).values([
      {
        itemId: input.itemId,
        activityType: "signal_correlated",
        body: `Signal ${input.signalId} correlated to this item.`,
        authorUserId: input.actorUserId,
      },
      {
        signalId: input.signalId,
        activityType: "signal_correlated",
        body: `Signal correlated to item ${input.itemId}.`,
        authorUserId: input.actorUserId,
      },
    ])

    return { relationId }
  })
}

export async function startPlannerSession(input: {
  scope: PlannerScopeInput
  itemId?: string
  actorUserId: string
}): Promise<{ id: string }> {
  if (input.itemId) {
    await getScopedItemOrThrow(input.scope, input.itemId)
  }

  const [row] = await db
    .insert(plannerSession)
    .values({
      ...scopeValues(input.scope),
      itemId: input.itemId ?? null,
      status: "active",
      startedAt: new Date(),
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
    .returning({ id: plannerSession.id })

  await db.insert(plannerActivity).values({
    itemId: input.itemId ?? null,
    activityType: "session_started",
    body: "Execution session started.",
    authorUserId: input.actorUserId,
  })

  return row
}

export async function stopPlannerSession(input: {
  scope: PlannerScopeInput
  sessionId: string
  actorUserId: string
}): Promise<void> {
  const [existing] = await db
    .select()
    .from(plannerSession)
    .where(
      and(
        eq(plannerSession.id, input.sessionId),
        input.scope.scopeKind === "organization"
          ? eq(plannerSession.organizationId, input.scope.organizationId)
          : eq(plannerSession.ownerUserId, input.scope.ownerUserId)
      )
    )
    .limit(1)

  if (!existing) {
    throw new Error("Session not found")
  }

  const endedAt = new Date()
  const durationMinutes = calculatePlannerSessionMinutes({
    startedAt: existing.startedAt,
    endedAt,
  })

  await db
    .update(plannerSession)
    .set({
      status: "completed",
      endedAt,
      durationMinutes,
      updatedAt: endedAt,
      updatedByUserId: input.actorUserId,
    })
    .where(eq(plannerSession.id, input.sessionId))

  await db.insert(plannerActivity).values({
    itemId: existing.itemId,
    activityType: "session_stopped",
    body: "Execution session stopped.",
    authorUserId: input.actorUserId,
  })
}

export async function insertPlannerComment(input: {
  scope: PlannerScopeInput
  itemId: string
  body: string
  actorUserId: string
}): Promise<void> {
  await getScopedItemOrThrow(input.scope, input.itemId)

  await db.insert(plannerComment).values({
    itemId: input.itemId,
    authorUserId: input.actorUserId,
    body: input.body,
  })

  await db.insert(plannerActivity).values({
    itemId: input.itemId,
    activityType: "comment_added",
    body: "Execution comment added.",
    authorUserId: input.actorUserId,
  })
}

export async function insertPlannerAttachment(input: {
  scope: PlannerScopeInput
  itemId: string
  url: string
  contentSha256: string
  mimeType: string
  sizeBytes: number
  actorUserId: string
}): Promise<{ attachmentId: string }> {
  await getScopedItemOrThrow(input.scope, input.itemId)

  const [row] = await db
    .insert(plannerAttachment)
    .values({
      itemId: input.itemId,
      url: input.url,
      contentSha256: input.contentSha256,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    })
    .returning({ attachmentId: plannerAttachment.id })

  await db.insert(plannerActivity).values({
    itemId: input.itemId,
    activityType: "attachment_added",
    body: "Execution attachment added.",
    authorUserId: input.actorUserId,
  })

  return row
}

export async function upsertPlannerView(input: {
  scope: PlannerScopeInput
  viewId?: string
  slug?: string | null
  name: string
  surface: PlannerViewRow["surface"]
  filterState: unknown
  sortMode?: string | null
}): Promise<{ id: string; slug: string }> {
  const normalizedFilterState = normalizePlannerViewFilterState(input.filterState)
  const scopeShape = scopeValues(input.scope)
  const now = new Date()
  const slug = slugifyPlannerViewName(input.slug ?? input.name)

  return db.transaction(async (tx) => {
    if (input.viewId) {
      const [updated] = await tx
        .update(plannerView)
        .set({
          slug,
          name: input.name.trim(),
          surface: input.surface,
          filterState: normalizedFilterState,
          sortMode: trimToNull(input.sortMode),
          updatedAt: now,
        })
        .where(
          and(
            eq(plannerView.id, input.viewId),
            input.scope.scopeKind === "organization"
              ? eq(plannerView.organizationId, input.scope.organizationId)
              : eq(plannerView.ownerUserId, input.scope.ownerUserId)
          )
        )
        .returning({ id: plannerView.id, slug: plannerView.slug })

      if (!updated) {
        throw new Error("Saved view not found")
      }

      return updated
    }

    const [created] = await tx
      .insert(plannerView)
      .values({
        ...scopeShape,
        slug,
        name: input.name.trim(),
        surface: input.surface,
        filterState: normalizedFilterState,
        sortMode: trimToNull(input.sortMode),
      })
      .returning({ id: plannerView.id, slug: plannerView.slug })

    return created
  })
}

export async function deletePlannerView(input: {
  scope: PlannerScopeInput
  viewId: string
}): Promise<void> {
  const deletedRows = await db
    .delete(plannerView)
    .where(
      and(
        eq(plannerView.id, input.viewId),
        input.scope.scopeKind === "organization"
          ? eq(plannerView.organizationId, input.scope.organizationId)
          : eq(plannerView.ownerUserId, input.scope.ownerUserId)
      )
    )
    .returning({ id: plannerView.id })

  if (deletedRows.length === 0) {
    throw new Error("Saved view not found")
  }
}

export async function markPlannerReminderDelivered(input: {
  organizationId: string
  reminderId: string
  actorUserId: string
  deliveredAt: Date
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        reminder: plannerReminder,
        item: plannerItem,
      })
      .from(plannerReminder)
      .innerJoin(plannerItem, eq(plannerReminder.itemId, plannerItem.id))
      .where(
        and(
          eq(plannerReminder.id, input.reminderId),
          eq(plannerItem.organizationId, input.organizationId)
        )
      )
      .limit(1)

    if (!row || row.reminder.status === "delivered") {
      return false
    }

    await tx
      .update(plannerReminder)
      .set({
        status: "delivered",
        deliveredAt: input.deliveredAt,
        updatedAt: input.deliveredAt,
      })
      .where(eq(plannerReminder.id, row.reminder.id))

    await tx.insert(plannerActivity).values({
      itemId: row.item.id,
      activityType: "reminder_delivered",
      body: "Reminder delivered.",
      metadata: { reminderId: row.reminder.id },
      authorUserId: input.actorUserId,
    })

    return true
  })
}

export async function markPlannerRecurrenceProcessed(input: {
  organizationId: string
  recurrenceId: string
  actorUserId: string
  processedAt: Date
  nextRunAt: Date | null
  createdItemId?: string | null
  runKey: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        recurrence: plannerRecurrence,
        item: plannerItem,
      })
      .from(plannerRecurrence)
      .innerJoin(plannerItem, eq(plannerRecurrence.itemId, plannerItem.id))
      .where(
        and(
          eq(plannerRecurrence.id, input.recurrenceId),
          eq(plannerItem.organizationId, input.organizationId)
        )
      )
      .limit(1)

    if (!row) {
      throw new Error("Recurrence not found")
    }

    await tx
      .update(plannerRecurrence)
      .set({
        lastRunAt: input.processedAt,
        nextRunAt: input.nextRunAt,
        updatedAt: input.processedAt,
      })
      .where(eq(plannerRecurrence.id, row.recurrence.id))

    await tx.insert(plannerActivity).values({
      itemId: row.item.id,
      activityType: "recurrence_processed",
      body: input.createdItemId
        ? "Recurrence processed and materialized into a new item."
        : "Recurrence processed.",
      metadata: {
        recurrenceId: row.recurrence.id,
        createdItemId: input.createdItemId ?? null,
        runKey: input.runKey,
      },
      authorUserId: input.actorUserId,
    })
  })
}
