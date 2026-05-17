import { auth } from "#lib/auth"
import { routeJsonOk } from "#lib/api/route-handler-json.shared"

export async function GET() {
  return routeJsonOk({
    ok: true,
    service: "neon-auth",
    checks: {
      configLoaded: Boolean(auth),
    },
    checkedAt: new Date().toISOString(),
  })
}
