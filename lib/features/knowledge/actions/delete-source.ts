"use server"

import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { KNOWLEDGE_AUDIT_ACTIONS } from "#features/knowledge/constants"
import type { KnowledgeSourceActionState } from "#features/knowledge/types"

import { deleteKnowledgeSourceInputSchema } from "../schemas/source.schema"
import { deleteKnowledgeSourceForOrganization } from "../data/source.mutations.server"

export async function deleteKnowledgeSourceAction(
  _prev: KnowledgeSourceActionState,
  formData: FormData
): Promise<KnowledgeSourceActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, errors: { form: "Admin role required." } }

  const parsed = deleteKnowledgeSourceInputSchema.safeParse({
    sourceId: formData.get("sourceId"),
  })
  if (!parsed.success)
    return { ok: false, errors: { form: "Invalid source id." } }

  const deleted = await deleteKnowledgeSourceForOrganization({
    organizationId: session.organizationId,
    sourceId: parsed.data.sourceId,
  })
  if (!deleted) return { ok: false, errors: { form: "Source not found." } }

  void writeIamAuditEventFromNextHeaders({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_DELETE,
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "knowledge.source",
    resourceId: parsed.data.sourceId,
  })

  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true }
}

export async function deleteKnowledgeSourceFormAction(
  formData: FormData
): Promise<void> {
  void (await deleteKnowledgeSourceAction(undefined, formData))
}
