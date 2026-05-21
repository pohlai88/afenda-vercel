import type { NextRequest } from "next/server"

import {
  ingestTimeClockBatch,
  resolveTimeClockIngestActor,
  timeClockIngestBatchSchema,
} from "#features/hrm/server"
import { routeJsonError, routeJsonOk } from "#lib/api/route-handler-json.shared"

export const maxDuration = 60

/**
 * External time clock punch ingestion (HRM-TCI-010).
 * Auth: org session cookie, or `Authorization: Bearer <key>` with
 * `x-afenda-organization-id` matching the batch `organizationId`.
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return routeJsonError("Invalid JSON body", 400)
  }

  const parsed = timeClockIngestBatchSchema.safeParse(body)
  if (!parsed.success) {
    return routeJsonError("Validation failed", 400)
  }

  const actor = await resolveTimeClockIngestActor(
    request,
    parsed.data.organizationId
  )
  if (!actor) {
    return routeJsonError("Unauthorized", 401)
  }

  const result = await ingestTimeClockBatch(actor, parsed.data)

  if ("ok" in result && result.ok === false) {
    return routeJsonError(result.errors.form ?? "Ingest rejected", 400)
  }

  return routeJsonOk(result)
}
