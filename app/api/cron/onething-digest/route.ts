import type { NextRequest } from "next/server"

import { enqueueOneThingReminderWorkflowRun } from "#features/execution"
import { listDistinctOrgIdsWithOneThing } from "#features/onething/server"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  const orgIds = await listDistinctOrgIdsWithOneThing()
  for (const organizationId of orgIds) {
    await enqueueOneThingReminderWorkflowRun({
      organizationId,
      actorUserId: "cron:onething-digest",
      actorSessionId: "cron:onething-digest",
    })
  }

  return routeJsonOk({
    ok: true,
    job: "onething-digest",
    enqueued: orgIds.length,
    ranAt: new Date().toISOString(),
  })
}
