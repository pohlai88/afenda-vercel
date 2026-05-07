import { NextResponse } from "next/server"

import { auth } from "#lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "better-auth",
    checks: {
      configLoaded: Boolean(auth),
    },
    checkedAt: new Date().toISOString(),
  })
}
