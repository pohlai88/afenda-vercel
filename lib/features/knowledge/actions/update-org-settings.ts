"use server"

import { after } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { KNOWLEDGE_AUDIT_ACTIONS } from "../constants"
import { upsertKnowledgeOrgSetting } from "../data/settings.queries.server"

export type UpdateKnowledgeOrgSettingsState =
  | undefined
  | { ok: true }
  | { ok: false; error: string }

function orgKnowledgeSettingsTag(organizationId: string) {
  return `org:${organizationId}:knowledge:settings`
}

export async function updateKnowledgeOrgSettingsAction(
  _prev: UpdateKnowledgeOrgSettingsState,
  formData: FormData
): Promise<UpdateKnowledgeOrgSettingsState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, error: "Admin role required." }

  const retrievalHybridEnabled = formData.get("retrievalHybridEnabled") === "1"
  const retrievalRerankEnabled = formData.get("retrievalRerankEnabled") === "1"
  const enforceZdr = formData.get("enforceZdr") === "1"

  await upsertKnowledgeOrgSetting(session.organizationId, {
    retrievalHybridEnabled,
    retrievalRerankEnabled,
    enforceZdr,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: KNOWLEDGE_AUDIT_ACTIONS.SETTINGS_UPDATE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "knowledge.setting",
      metadata: {
        retrievalHybridEnabled,
        retrievalRerankEnabled,
        enforceZdr,
      },
    })
  )

  revalidateTag(orgKnowledgeSettingsTag(session.organizationId), "max")
  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true }
}

export async function updateKnowledgeOrgSettingsFormAction(
  formData: FormData
): Promise<void> {
  void (await updateKnowledgeOrgSettingsAction(undefined, formData))
}
