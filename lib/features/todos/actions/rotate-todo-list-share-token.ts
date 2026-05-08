"use server"

import { createHash, randomBytes } from "node:crypto"

import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { ORG_DASHBOARD_TODOS } from "#lib/dashboard-module-paths"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import {
  toLocaleOrgDashboardRevalidatePattern,
  toLocalePath,
} from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"
import type { Route } from "next"

import { setTodoListShareTokenHash } from "../data/todos.mutations.server"
import { getOrgTodoListById } from "../data/todos.queries.server"

export async function rotateTodoListShareToken(formData: FormData): Promise<{
  ok: boolean
  token?: string
  error?: string
}> {
  const session = await requireOrgSession()
  const listId = String(formData.get("listId") ?? "")
  const resumePath = String(
    formData.get("resumePath") ?? "/o/placeholder/dashboard/todos"
  )

  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, resumePath as Route) as unknown as string,
  })

  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) {
    return { ok: false, error: "Admin role required." }
  }

  if (!listId) {
    return { ok: false, error: "Missing list." }
  }

  const list = await getOrgTodoListById(session.organizationId, listId)
  if (!list) {
    return { ok: false, error: "List not found." }
  }

  const token = randomBytes(32).toString("base64url")
  const shareTokenHash = createHash("sha256")
    .update(token, "utf8")
    .digest("hex")

  await setTodoListShareTokenHash(
    listId,
    session.organizationId,
    shareTokenHash
  )

  void writeIamAuditEventFromNextHeaders({
    action: "org.todo.list.rotate_share_token",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "todo.list",
    resourceId: listId,
    metadata: {},
  })

  revalidatePath(
    toLocaleOrgDashboardRevalidatePattern(ORG_DASHBOARD_TODOS),
    "page"
  )

  return { ok: true, token }
}
