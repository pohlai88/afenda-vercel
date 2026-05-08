import { randomUUID } from "node:crypto"
import type { NextRequest } from "next/server"

import { enqueueKnowledgeSourceSyncWorkflowRun } from "#features/execution"
import { listEnabledKnowledgeSourceRefs } from "#features/knowledge"
import { routeJsonError, routeJsonOk } from "#lib/route-handler-json.shared"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return routeJsonError("Unauthorized", 401)
  }

  const refs = await listEnabledKnowledgeSourceRefs()
  for (const ref of refs) {
    await enqueueKnowledgeSourceSyncWorkflowRun({
      runId: randomUUID(),
      organizationId: ref.organizationId,
      sourceId: ref.sourceId,
      actorUserId: ref.createdByUserId ?? "system",
      actorSessionId: "cron:knowledge-sync",
    })
  }

  return routeJsonOk({
    ok: true,
    job: "knowledge-sync",
    enqueued: refs.length,
    ranAt: new Date().toISOString(),
  })
}
