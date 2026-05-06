import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

export function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    message: "ERP cron stub — add idempotent batch work here.",
    ranAt: new Date().toISOString(),
  })
}
