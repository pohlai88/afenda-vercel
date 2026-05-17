import { sql } from "drizzle-orm"

import { routeJsonOk } from "#lib/api/route-handler-json.shared"

type PublicHealthState = "ok" | "error"

type PublicHealthResponse = {
  ok: boolean
  checkedAt: string
  checks: {
    app: PublicHealthState
    database: PublicHealthState
    runtime: PublicHealthState
  }
}

export async function GET() {
  let database: PublicHealthState = "ok"

  try {
    const { db } = await import("#lib/db")
    await db.execute(sql`select 1`)
  } catch {
    database = "error"
  }

  const body: PublicHealthResponse = {
    ok: database === "ok",
    checkedAt: new Date().toISOString(),
    checks: {
      app: "ok",
      database,
      runtime: "ok",
    },
  }

  return routeJsonOk(body, { status: body.ok ? 200 : 503 })
}
