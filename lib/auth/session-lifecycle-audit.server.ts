import "server-only"

import { auth } from "./neon.server"
import {
  normalizeAuthApiPath,
  resolveIamSessionLifecycleAudit,
} from "./session-lifecycle-audit.shared"
import { writeIamAuditEventFromHeaders } from "./audit.server"

export type WriteSessionLifecycleAuditInput = {
  request: Request
  actorUserId: string
  actorSessionId?: string | null
  organizationId?: string | null
}

type AuthActorContext = {
  userId: string
  sessionId: string | null
  organizationId: string | null
}

function readOrganizationIdFromSession(session: unknown): string | null {
  if (!session || typeof session !== "object") return null
  const orgId = (session as { activeOrganizationId?: string | null })
    .activeOrganizationId
  return typeof orgId === "string" && orgId.length > 0 ? orgId : null
}

function readActorFromAuthPayload(payload: unknown): AuthActorContext | null {
  if (!payload || typeof payload !== "object") return null
  const root = payload as Record<string, unknown>
  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : root
  const user = data.user
  const session = data.session
  if (!user || typeof user !== "object") return null
  const userId = (user as { id?: string }).id
  if (typeof userId !== "string" || userId.length === 0) return null
  const sessionId =
    session && typeof session === "object"
      ? ((session as { id?: string }).id ?? null)
      : null
  return {
    userId,
    sessionId: typeof sessionId === "string" ? sessionId : null,
    organizationId: readOrganizationIdFromSession(session),
  }
}

async function resolveAuthActorContext(
  request: Request,
  response: Response
): Promise<AuthActorContext | null> {
  const contentType = response.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      const payload = await response.clone().json()
      const fromBody = readActorFromAuthPayload(payload)
      if (fromBody) return fromBody
    } catch {
      // fall through to session read
    }
  }

  const { data } = await auth.getSession({
    fetchOptions: { headers: request.headers },
  })
  if (!data?.user?.id) return null
  return {
    userId: data.user.id,
    sessionId: data.session?.id ?? null,
    organizationId: readOrganizationIdFromSession(data.session),
  }
}

/**
 * Writes `iam.session.sign_in` / `iam.session.sign_up` when Better Auth
 * establishes a session on a mapped auth API path.
 */
export async function writeSessionLifecycleAuditFromAuthRequest(
  input: WriteSessionLifecycleAuditInput
): Promise<void> {
  const pathname = new URL(input.request.url).pathname
  const authPath = normalizeAuthApiPath(pathname)
  const lifecycle = resolveIamSessionLifecycleAudit(authPath)
  if (!lifecycle) return

  await writeIamAuditEventFromHeaders(input.request.headers, {
    action: lifecycle.action,
    actorUserId: input.actorUserId,
    actorSessionId: input.actorSessionId ?? null,
    organizationId: input.organizationId ?? null,
    path: authPath,
    metadata: { method: lifecycle.method },
  })
}

/** Best-effort lifecycle audit after `/api/auth/*` mutations — must not throw. */
export async function recordAuthSessionLifecycleAudit(
  request: Request,
  response: Response
): Promise<void> {
  if (!response.ok) return
  if (!["POST", "PUT", "PATCH"].includes(request.method)) return

  const pathname = new URL(request.url).pathname
  const authPath = normalizeAuthApiPath(pathname)
  if (!resolveIamSessionLifecycleAudit(authPath)) return

  const actor = await resolveAuthActorContext(request, response)
  if (!actor) return

  await writeSessionLifecycleAuditFromAuthRequest({
    request,
    actorUserId: actor.userId,
    actorSessionId: actor.sessionId,
    organizationId: actor.organizationId,
  })
}
