"use server"

import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { KNOWLEDGE_AUDIT_ACTIONS } from "../constants"
import { setKnowledgeSourceEnabled } from "../data/source.mutations.server"

export type ToggleKnowledgeSourceEnabledState =
  | undefined
  | { ok: true }
  | { ok: false; error: string }

export async function toggleKnowledgeSourceEnabledAction(
  _prev: ToggleKnowledgeSourceEnabledState,
  formData: FormData
): Promise<ToggleKnowledgeSourceEnabledState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const sourceId = formData.get("sourceId")
  const enabled = formData.get("enabled") === "1"
  if (typeof sourceId !== "string" || sourceId.length === 0) {
    return { ok: false, error: "Missing source id." }
  }

  const updated = await setKnowledgeSourceEnabled({
    organizationId: session.organizationId,
    sourceId,
    enabled,
  })
  if (!updated) return { ok: false, error: "Source not found." }

  void writeIamAuditEventFromNextHeaders({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_UPDATE,
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "knowledge.source",
    resourceId: sourceId,
    metadata: { enabled },
  })

  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true }
}

export async function toggleKnowledgeSourceEnabledFormAction(
  formData: FormData
): Promise<void> {
  void (await toggleKnowledgeSourceEnabledAction(undefined, formData))
}
