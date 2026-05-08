"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import {
  canActInOrganization,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { enqueueKnowledgeSourceSyncWorkflowRun } from "#features/execution"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { requireOrgSession } from "#lib/tenant"

import { KNOWLEDGE_AUDIT_ACTIONS } from "#features/knowledge/constants"
import type { KnowledgeSourceSyncActionState } from "#features/knowledge/types"

import { runKnowledgeSourceSyncInputSchema } from "../schemas/source.schema"

export async function runKnowledgeSourceSyncAction(
  _prev: KnowledgeSourceSyncActionState,
  formData: FormData
): Promise<KnowledgeSourceSyncActionState> {
  const session = await requireOrgSession()
  const allowed = await canActInOrganization(
    session.userId,
    session.user.role,
    session.organizationId,
    "admin"
  )
  if (!allowed) return { ok: false, errors: { form: "Admin role required." } }

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

  void writeIamAuditEventFromNextHeaders({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_START,
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "knowledge.source",
    resourceId: parsed.data.sourceId,
    metadata: { runId, sourceId: parsed.data.sourceId },
  })

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
