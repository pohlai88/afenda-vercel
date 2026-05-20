import "server-only"

import { cache } from "react"
import { and, eq, gte, lte } from "drizzle-orm"

import { sendAuthEmail } from "#lib/auth/auth-mail.server"
import {
  publishOrgNotification,
  publishOrgNotificationIfMissing,
} from "#features/org-notifications/server"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"
import { db } from "#lib/db"
import { hrmEmployee, hrmShiftAssignment } from "#lib/db/schema"
import { organizationAppsPath } from "#lib/org-apps-module-paths"
import { getSiteUrl } from "#lib/site"

import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  buildSftAssignmentChangedTemplate,
  buildSftRosterPublishedTemplate,
  buildSftScheduleChangeResolvedTemplate,
  buildSftSwapResolvedTemplate,
  type SftNotificationTemplateMessage,
} from "./sft-notification-templates.shared"

const resolveSftLinkedPath = cache(
  async (organizationId: string): Promise<string> => {
    const slug = await getOrganizationSlugById(organizationId)
    if (!slug) return "/apps/hrm/shift-scheduling"
    return `${organizationAppsPath(slug, "hrm")}/shift-scheduling`
  }
)

async function resolveSftWorkbenchUrl(organizationId: string): Promise<string> {
  const path = await resolveSftLinkedPath(organizationId)
  return `${getSiteUrl()}${path}`
}

async function deliverSftEmployeeNotification(input: {
  readonly organizationId: string
  readonly employeeId: string
  readonly template: SftNotificationTemplateMessage
  readonly linkedEntityType: string
  readonly linkedEntityId: string
  readonly linkedEntityLabel: string
  readonly useIfMissing?: boolean
}): Promise<void> {
  const [employee] = await db
    .select({
      linkedUserId: hrmEmployee.linkedUserId,
      email: hrmEmployee.email,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  const linkedPath = await resolveSftLinkedPath(input.organizationId)
  const targetUserId = employee?.linkedUserId

  if (targetUserId) {
    try {
      const publish = input.useIfMissing
        ? publishOrgNotificationIfMissing
        : publishOrgNotification
      await publish({
        organizationId: input.organizationId,
        targetUserId,
        title: input.template.inApp.title,
        body: input.template.inApp.body,
        severity: "info",
        linkedEntityType: input.linkedEntityType,
        linkedEntityId: input.linkedEntityId,
        linkedEntityLabel: input.linkedEntityLabel,
        linkedPath,
        expiresAt: null,
      })
    } catch {
      // In-app delivery must not roll back scheduling mutations.
    }
  }

  const email = employee?.email?.trim()
  if (email && email.includes("@")) {
    sendAuthEmail({
      to: email,
      subject: input.template.email.subject,
      text: input.template.email.text,
      html: input.template.email.html,
    })
  }
}

export async function notifyRosterPublished(input: {
  readonly organizationId: string
  readonly publicationId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly note?: string | null
}): Promise<void> {
  const workbenchUrl = await resolveSftWorkbenchUrl(input.organizationId)
  const template = buildSftRosterPublishedTemplate({
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    note: input.note,
    workbenchUrl,
  })

  const assignmentRows = await db
    .selectDistinct({
      employeeId: hrmShiftAssignment.employeeId,
    })
    .from(hrmShiftAssignment)
    .where(
      and(
        eq(hrmShiftAssignment.organizationId, input.organizationId),
        gte(hrmShiftAssignment.attendanceDate, input.periodStart),
        lte(hrmShiftAssignment.attendanceDate, input.periodEnd)
      )
    )

  await Promise.all(
    assignmentRows.map((row) =>
      deliverSftEmployeeNotification({
        organizationId: input.organizationId,
        employeeId: row.employeeId,
        template,
        linkedEntityType: HRM_SFT_AUDIT.rosterPublish,
        linkedEntityId: input.publicationId,
        linkedEntityLabel: "shift_roster",
        useIfMissing: true,
      })
    )
  )
}

export async function notifyShiftAssignmentChanged(input: {
  readonly organizationId: string
  readonly assignmentId: string
  readonly employeeId: string
  readonly attendanceDate: string
  readonly templateName: string
}): Promise<void> {
  const workbenchUrl = await resolveSftWorkbenchUrl(input.organizationId)
  const template = buildSftAssignmentChangedTemplate({
    attendanceDate: input.attendanceDate,
    templateName: input.templateName,
    workbenchUrl,
  })

  await deliverSftEmployeeNotification({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    template,
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
  const workbenchUrl = await resolveSftWorkbenchUrl(input.organizationId)
  const template = buildSftSwapResolvedTemplate({
    outcome: input.outcome,
    workbenchUrl,
  })

  await Promise.all([
    deliverSftEmployeeNotification({
      organizationId: input.organizationId,
      employeeId: input.requesterEmployeeId,
      template,
      linkedEntityType: HRM_SFT_AUDIT.swapApprove,
      linkedEntityId: input.swapRequestId,
      linkedEntityLabel: "shift_swap",
    }),
    deliverSftEmployeeNotification({
      organizationId: input.organizationId,
      employeeId: input.counterpartyEmployeeId,
      template,
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
  readonly proposedDate?: string
  readonly proposedTemplateCode?: string
  readonly managerNote?: string | null
}): Promise<void> {
  const workbenchUrl = await resolveSftWorkbenchUrl(input.organizationId)
  const template = buildSftScheduleChangeResolvedTemplate({
    outcome: input.outcome,
    proposedDate: input.proposedDate,
    proposedTemplateCode: input.proposedTemplateCode,
    managerNote: input.managerNote,
    workbenchUrl,
  })

  await deliverSftEmployeeNotification({
    organizationId: input.organizationId,
    employeeId: input.requesterEmployeeId,
    template,
    linkedEntityType: HRM_SFT_AUDIT.scheduleChangeApprove,
    linkedEntityId: input.requestId,
    linkedEntityLabel: "schedule_change",
  })
}
