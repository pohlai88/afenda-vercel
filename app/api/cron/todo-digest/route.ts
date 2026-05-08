import type { NextRequest } from "next/server"

import { enqueueTodoReminderWorkflowRun } from "#features/execution"
import { listDistinctOrgIdsWithTodos } from "#features/todos"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  const orgIds = await listDistinctOrgIdsWithTodos()
  for (const organizationId of orgIds) {
    await enqueueTodoReminderWorkflowRun({
      organizationId,
      actorUserId: "cron:todo-digest",
      actorSessionId: "cron:todo-digest",
    })
  }

  return routeJsonOk({
    ok: true,
    job: "todo-digest",
    enqueued: orgIds.length,
    ranAt: new Date().toISOString(),
  })
}
