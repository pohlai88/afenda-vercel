"use server"

import { createHash, randomBytes } from "node:crypto"

import {
  canActInOrganization,
  requireRecentAuthStepUp,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { getRequestAppLocale } from "#lib/i18n/request-locale.server"
import { toLocalePath } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { revalidateOrgOneThingDashboard } from "../data/onething-revalidate.server"
import { resolveOrgOneThingAdminStepUpResumePath } from "../data/onething-step-up-resume.server"
import { setOneThingListShareTokenHash } from "../data/onething.mutations.server"
import { getOrgOneThingListById } from "../data/onething.queries.server"

export async function rotateOneThingListShareToken(
  formData: FormData
): Promise<{
  ok: boolean
  token?: string
  error?: string
}> {
  const session = await requireOrgSession()
  const listId = String(formData.get("listId") ?? "")
  const resumePath = await resolveOrgOneThingAdminStepUpResumePath(
    formData,
    session.organizationId
  )

  const locale = await getRequestAppLocale()
  await requireRecentAuthStepUp({
    returnTo: toLocalePath(locale, resumePath) as unknown as string,
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

  const list = await getOrgOneThingListById(session.organizationId, listId)
  if (!list) {
    return { ok: false, error: "List not found." }
  }

  const token = randomBytes(32).toString("base64url")
  const shareTokenHash = createHash("sha256")
    .update(token, "utf8")
    .digest("hex")

  await setOneThingListShareTokenHash(
    listId,
    session.organizationId,
    shareTokenHash
  )

  await writeIamAuditEventFromNextHeaders({
    action: "org.onething.list.rotate_share_token",
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "onething.list",
    resourceId: listId,
    metadata: {},
  })

  revalidateOrgOneThingDashboard()

  return { ok: true, token }
}
