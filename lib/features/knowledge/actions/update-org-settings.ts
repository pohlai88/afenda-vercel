"use server"

import { after } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireErpPermission } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

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
  const gate = await requireErpPermission({
    module: "knowledge",
    object: "settings",
    function: "update",
  })
  if (!gate.ok) return { ok: false, error: gate.error }
  const session = gate.session

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
