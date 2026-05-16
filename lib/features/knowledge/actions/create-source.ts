"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireErpPermission } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import {
  KNOWLEDGE_AUDIT_ACTIONS,
  type KnowledgeSourceKind,
} from "#features/knowledge/constants"
import type { KnowledgeSourceActionState } from "#features/knowledge/types"

import {
  createKnowledgeSourceInputSchema,
  parseSourceConfigJson,
} from "../schemas/source.schema"
import { insertKnowledgeSource } from "../data/source.mutations.server"

export async function createKnowledgeSourceAction(
  _prev: KnowledgeSourceActionState,
  formData: FormData
): Promise<KnowledgeSourceActionState> {
  const gate = await requireErpPermission({
    module: "knowledge",
    object: "source",
    function: "create",
  })
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.error } }
  }
  const session = gate.session

  const parsed = createKnowledgeSourceInputSchema.safeParse({
    kind: formData.get("kind"),
    name: formData.get("name"),
    configJson: formData.get("configJson"),
    enabled: formData.get("enabled") !== "false",
  })
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        kind: errors.kind?.[0],
        name: errors.name?.[0],
      },
    }
  }

  const config = parseSourceConfigJson(parsed.data.configJson)
  if (!config.ok) {
    return { ok: false, errors: { form: "Config JSON is invalid." } }
  }

  const row = await insertKnowledgeSource({
    organizationId: session.organizationId,
    kind: parsed.data.kind as KnowledgeSourceKind,
    name: parsed.data.name,
    config: config.value,
    enabled: parsed.data.enabled,
    createdByUserId: session.userId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_CREATE,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "knowledge.source",
      resourceId: row.id,
      metadata: { kind: parsed.data.kind },
    })
  )

  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true, sourceId: row.id }
}

/** Native `<form action>` entry — progressive enhancement without `useActionState`. */
export async function createKnowledgeSourceFormAction(
  formData: FormData
): Promise<void> {
  void (await createKnowledgeSourceAction(undefined, formData))
}
