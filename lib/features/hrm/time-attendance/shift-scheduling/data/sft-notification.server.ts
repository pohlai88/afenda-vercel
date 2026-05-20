import "server-only"

import { cache } from "react"
import { and, eq, gte, isNotNull, lte } from "drizzle-orm"

import {
  publishOrgNotification,
  publishOrgNotificationIfMissing,
} from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import { hrmEmployee, hrmShiftAssignment } from "#lib/db/schema"
import { organizationAppsPath } from "#lib/org-apps-module-paths"

import { HRM_SFT_AUDIT } from "../sft.contract"

const resolveSftLinkedPath = cache(
  async (organizationId: string): Promise<string> => {
    const slug = await getOrganizationSlugById(organizationId)
    if (!slug) return "/apps/hrm/shift-scheduling"
    return `${organizationAppsPath(slug, "hrm")}/shift-scheduling`
  }
)

async function notifyLinkedEmployee(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly title: string
  readonly body: string
  readonly linkedEntityType: string
  readonly linkedEntityId: string
  readonly linkedEntityLabel: string
}): Promise<void> {
  const [employee] = await db
    .select({ linkedUserId: hrmEmployee.linkedUserId })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  const targetUserId = employee?.linkedUserId
  if (!targetUserId) return

  const linkedPath = await resolveSftLinkedPath(input.organizationId)

  try {
    await publishOrgNotification({
      organizationId: input.organizationId,
      targetUserId,
      title: input.title,
      body: input.body,
      severity: "info",
      linkedEntityType: input.linkedEntityType,
      linkedEntityId: input.linkedEntityId,
      linkedEntityLabel: input.linkedEntityLabel,
      linkedPath,
      expiresAt: null,
    })
  } catch {
    // Delivery must not roll back assignment mutations.
  }
}

export async function notifyRosterPublished(input: {
  readonly organizationId: string
  readonly publicationId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly note?: string | null
}): Promise<void> {
  const linkedPath = await resolveSftLinkedPath(input.organizationId)

  const assignmentRows = await db
    .selectDistinct({
      employeeId: hrmShiftAssignment.employeeId,
      linkedUserId: hrmEmployee.linkedUserId,
    })
    .from(hrmShiftAssignment)
    .innerJoin(
      hrmEmployee,
      and(
        eq(hrmEmployee.id, hrmShiftAssignment.employeeId),
        eq(hrmEmployee.organizationId, hrmShiftAssignment.organizationId)
      )
    )
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, input.organizationId),
        gte(hrmShiftAssignment.attendanceDate, input.periodStart),
        lte(hrmShiftAssignment.attendanceDate, input.periodEnd),
        isNotNull(hrmEmployee.linkedUserId)
      )
    )

  const title = "Shift roster published"
  const noteSuffix = input.note?.trim() ? ` Note: ${input.note.trim()}` : ""
  const body = `Your shift roster for ${input.periodStart} through ${input.periodEnd} is published.${noteSuffix}`

  await Promise.all(
    assignmentRows.map(async (row) => {
      const targetUserId = row.linkedUserId
      if (!targetUserId) return
      try {
        await publishOrgNotificationIfMissing({
          organizationId: input.organizationId,
          targetUserId,
          title,
          body,
          severity: "info",
          linkedEntityType: HRM_SFT_AUDIT.rosterPublish,
          linkedEntityId: input.publicationId,
          linkedEntityLabel: "shift_roster",
          linkedPath,
          expiresAt: null,
        })
      } catch {
        // Notification delivery must not roll back roster publication.
      }
    })
  )
}

export async function notifyShiftAssignmentChanged(input: {
  readonly organizationId: string
  readonly assignmentId: string
  readonly employeeId: string
  readonly attendanceDate: string
  readonly templateName: string
}): Promise<void> {
  await notifyLinkedEmployee({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    title: "Shift schedule updated",
    body: `Your shift on ${input.attendanceDate} is now ${input.templateName}.`,
    linkedEntityType: HRM_SFT_AUDIT.assignmentUpdate,
    linkedEntityId: input.assignmentId,
    linkedEntityLabel: "shift_assignment",
  })
}

export async function notifyShiftSwapResolved(input: {
  readonly organizationId: string
  readonly swapRequestId: string
  readonly requesterEmployeeId: string
  readonly counterpartyEmployeeId: string
  readonly outcome: "approved" | "rejected" | "returned" | "overridden"
}): Promise<void> {
  const title =
    input.outcome === "approved"
      ? "Shift swap approved"
      : input.outcome === "rejected"
        ? "Shift swap rejected"
        : input.outcome === "returned"
          ? "Shift swap returned"
          : "Shift swap updated"

  const body =
    input.outcome === "approved"
      ? "Your shift swap request was approved."
      : input.outcome === "rejected"
        ? "Your shift swap request was rejected."
        : input.outcome === "returned"
          ? "Your shift swap request was returned for changes."
          : "A manager updated your shift swap request."

  await Promise.all([
    notifyLinkedEmployee({
      organizationId: input.organizationId,
      employeeId: input.requesterEmployeeId,
      title,
      body,
      linkedEntityType: HRM_SFT_AUDIT.swapApprove,
      linkedEntityId: input.swapRequestId,
      linkedEntityLabel: "shift_swap",
    }),
    notifyLinkedEmployee({
      organizationId: input.organizationId,
      employeeId: input.counterpartyEmployeeId,
      title,
      body,
      linkedEntityType: HRM_SFT_AUDIT.swapApprove,
      linkedEntityId: input.swapRequestId,
      linkedEntityLabel: "shift_swap",
    }),
  ])
}

export async function notifyScheduleChangeResolved(input: {
  readonly organizationId: string
  readonly requestId: string
  readonly requesterEmployeeId: string
  readonly outcome: "approved" | "rejected" | "returned"
}): Promise<void> {
  const title =
    input.outcome === "approved"
      ? "Schedule change approved"
      : input.outcome === "rejected"
        ? "Schedule change rejected"
        : "Schedule change returned"

  const body =
    input.outcome === "approved"
      ? "Your schedule change request was approved."
      : input.outcome === "rejected"
        ? "Your schedule change request was rejected."
        : "Your schedule change request was returned for changes."

  await notifyLinkedEmployee({
    organizationId: input.organizationId,
    employeeId: input.requesterEmployeeId,
    title,
    body,
    linkedEntityType: HRM_SFT_AUDIT.scheduleChangeApprove,
    linkedEntityId: input.requestId,
    linkedEntityLabel: "schedule_change",
  })
}
