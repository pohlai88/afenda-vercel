import type { NextRequest } from "next/server"
import { sql } from "drizzle-orm"

import { db } from "#lib/db"
import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import {
  buildPlannerBlockedEscalationNotice,
  buildPlannerBlockedEscalationTargets,
  derivePlannerBlockedEscalationThresholdHours,
  organizationOrbitPath,
  shouldEscalatePlannerBlockedItem,
} from "#features/planner"
import { listPlannerBlockedItemsForEscalation } from "#features/planner/server"
import { getOrganizationSlugById } from "#lib/org-slug.server"
import { runWithNodeOtelSpan } from "#lib/otel-span.server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"

/** Vercel cron: `vercel.json` + `CRON_SECRET` Bearer auth; extend with idempotent batch jobs. */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  const started = Date.now()
  await runWithNodeOtelSpan(
    "cron.erp_jobs.database_ping",
    { "erp.cron": "erp-jobs", "erp.probe": "database_select_1" },
    async () => {
      await db.execute(sql`select 1`)
    }
  )

  const blockedRows = await listPlannerBlockedItemsForEscalation(100)
  let blockedEscalations = 0

  for (const row of blockedRows) {
    const organizationSlug = await getOrganizationSlugById(row.organizationId)
    const linkedPath = organizationSlug
      ? `${organizationOrbitPath(organizationSlug)}?focusKind=item&focusId=${row.itemId}`
      : null
    const blockedHours = Math.max(
      1,
      Math.floor((Date.now() - row.blockedAt.getTime()) / (60 * 60 * 1000))
    )
    if (
      !shouldEscalatePlannerBlockedItem({
        urgency: row.urgency,
        impact: row.impact,
        severity: row.severity,
        escalationLevel: row.escalationLevel,
        blockedHours,
        operationalFacts: row.operationalFacts,
      })
    ) {
      continue
    }
    const thresholdHours = derivePlannerBlockedEscalationThresholdHours({
      urgency: row.urgency,
      impact: row.impact,
      severity: row.severity,
      escalationLevel: row.escalationLevel,
      operationalFacts: row.operationalFacts,
    })
    const roleTargets = buildPlannerBlockedEscalationTargets({
      assigneeUserIds: row.assigneeUserIds,
      reviewerUserIds: row.reviewerUserIds,
      escalationOwnerUserIds: row.escalationOwnerUserIds,
    })

    if (roleTargets.length === 0) {
      const notice = buildPlannerBlockedEscalationNotice({
        role: "assignee",
        itemTitle: row.title,
        itemDescription: row.description,
        blockedHours,
        thresholdHours,
      })
      const result = await publishOrgNotificationIfMissing({
        organizationId: row.organizationId,
        title: notice.title,
        body: notice.body,
        severity: notice.severity,
        linkedEntityType: "planner_item",
        linkedEntityId: row.itemId,
        linkedEntityLabel: row.title,
        linkedPath,
      })

      if (result.created) blockedEscalations += 1
      continue
    }

    for (const target of roleTargets) {
      const notice = buildPlannerBlockedEscalationNotice({
        role: target.role,
        itemTitle: row.title,
        itemDescription: row.description,
        blockedHours,
        thresholdHours,
      })
      const result = await publishOrgNotificationIfMissing({
        organizationId: row.organizationId,
        targetUserId: target.userId,
        title: notice.title,
        body: notice.body,
        severity: notice.severity,
        linkedEntityType: "planner_item",
        linkedEntityId: row.itemId,
        linkedEntityLabel: row.title,
        linkedPath,
      })

      if (result.created) blockedEscalations += 1
    }
  }

  const durationMs = Date.now() - started

  return routeJsonOk({
    ok: true,
    job: "erp-jobs",
    ranAt: new Date().toISOString(),
    durationMs,
    observabilityProbe: "cron_database_ping",
    checks: { database: "ok", blockedEscalations },
  })
}
