"use server"

import { randomUUID } from "node:crypto"
import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { enqueueKnowledgeSourceSyncWorkflowRun } from "#features/execution"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import { KNOWLEDGE_AUDIT_ACTIONS } from "#features/knowledge/constants"
import type { KnowledgeSourceSyncActionState } from "#features/knowledge/types"

import { runKnowledgeSourceSyncInputSchema } from "../schemas/source.schema"

export async function runKnowledgeSourceSyncAction(
  _prev: KnowledgeSourceSyncActionState,
  formData: FormData
): Promise<KnowledgeSourceSyncActionState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, errors: { form: gate.error } }
  }
  const session = gate.session

  const parsed = runKnowledgeSourceSyncInputSchema.safeParse({
    sourceId: formData.get("sourceId"),
  })
  if (!parsed.success)
    return { ok: false, errors: { form: "Invalid source id." } }
  const runId = randomUUID()

  await enqueueKnowledgeSourceSyncWorkflowRun({
    runId,
    organizationId: session.organizationId,
    sourceId: parsed.data.sourceId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
  })

  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_START,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "knowledge.source",
      resourceId: parsed.data.sourceId,
      metadata: { runId, sourceId: parsed.data.sourceId },
    })
  )

  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true, enqueued: true }
}

export async function runKnowledgeSourceSyncFormAction(
  formData: FormData
): Promise<void> {
  void (await runKnowledgeSourceSyncAction(undefined, formData))
}
