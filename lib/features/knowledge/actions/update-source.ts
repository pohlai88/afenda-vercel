"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import { KNOWLEDGE_AUDIT_ACTIONS } from "#features/knowledge/constants"
import type { KnowledgeSourceActionState } from "#features/knowledge/types"

import {
  parseSourceConfigJson,
  updateKnowledgeSourceInputSchema,
} from "../schemas/source.schema"
import { updateKnowledgeSourceForOrganization } from "../data/source.mutations.server"

export async function updateKnowledgeSourceAction(
  _prev: KnowledgeSourceActionState,
  formData: FormData
): Promise<KnowledgeSourceActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.error } }
  }
  const session = gate.session

  const parsed = updateKnowledgeSourceInputSchema.safeParse({
    sourceId: formData.get("sourceId"),
    name: formData.get("name"),
    configJson: formData.get("configJson"),
    enabled: formData.get("enabled") !== "false",
  })
  if (!parsed.success) {
    return { ok: false, errors: { form: "Invalid source update payload." } }
  }
  const config = parseSourceConfigJson(parsed.data.configJson)
  if (!config.ok)
    return { ok: false, errors: { form: "Config JSON is invalid." } }

  const updated = await updateKnowledgeSourceForOrganization({
    organizationId: session.organizationId,
    sourceId: parsed.data.sourceId,
    name: parsed.data.name,
    config: config.value,
    enabled: parsed.data.enabled,
  })
  if (!updated) return { ok: false, errors: { form: "Source not found." } }

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_UPDATE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "knowledge.source",
      resourceId: parsed.data.sourceId,
    })
  )

  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true }
}

export async function updateKnowledgeSourceFormAction(
  formData: FormData
): Promise<void> {
  void (await updateKnowledgeSourceAction(undefined, formData))
}
