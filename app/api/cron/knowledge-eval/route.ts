import type { NextRequest } from "next/server"

import { enqueueKnowledgeEvalWorkflowRun } from "#features/execution"
import { listEvalSetRefs } from "#features/knowledge"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  const evalSets = await listEvalSetRefs()
  for (const row of evalSets) {
    await enqueueKnowledgeEvalWorkflowRun({
      organizationId: row.organizationId,
      evalSetId: row.evalSetId,
      actorUserId: row.createdByUserId ?? "system",
      actorSessionId: "cron:knowledge-eval",
      topK: 8,
    })
  }

  return routeJsonOk({
    ok: true,
    job: "knowledge-eval",
    enqueued: evalSets.length,
    ranAt: new Date().toISOString(),
  })
}
