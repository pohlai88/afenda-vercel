import "server-only"

import { auth } from "#lib/auth"
import { recordAuthSessionLifecycleAudit } from "#lib/auth/session-lifecycle-audit.server"

/** Session cookies and OAuth callbacks must not be statically cached. */

const handler = auth.handler()

type AuthRouteContext = Parameters<typeof handler.POST>[1]

async function withSessionLifecycleAudit(
  request: Request,
  response: Response
): Promise<Response> {
  try {
    await recordAuthSessionLifecycleAudit(request, response)
  } catch {
    // Lifecycle audit is best-effort — auth responses must never fail because of it.
  }
  return response
}

function wrapAuthHandler(
  method: (
    request: Request,
    context: AuthRouteContext
  ) => Promise<Response> | Response
) {
  return async (request: Request, context: AuthRouteContext) => {
    const response = await method(request, context)
    return withSessionLifecycleAudit(request, response)
  }
}

export const GET = handler.GET
export const POST = wrapAuthHandler(handler.POST)
export const PUT = wrapAuthHandler(handler.PUT)
export const DELETE = handler.DELETE
export const PATCH = wrapAuthHandler(handler.PATCH)
