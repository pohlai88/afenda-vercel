import "server-only"

import { cache } from "react"
import { and, eq, gte, isNotNull, lte } from "drizzle-orm"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
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
