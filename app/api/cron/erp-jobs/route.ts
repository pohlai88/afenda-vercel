import type { NextRequest } from "next/server"
import { sql } from "drizzle-orm"

import { db } from "#lib/db"
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
  await db.execute(sql`select 1`)
  const durationMs = Date.now() - started

  return routeJsonOk({
    ok: true,
    job: "erp-jobs",
    ranAt: new Date().toISOString(),
    durationMs,
    checks: { database: "ok" },
  })
}
