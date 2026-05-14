"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import { KNOWLEDGE_AUDIT_ACTIONS } from "../constants"

export type CancelKnowledgeSourceSyncState =
  | undefined
  | { ok: true }
  | { ok: false; error: string }

export async function cancelKnowledgeSourceSyncAction(
  _prev: CancelKnowledgeSourceSyncState,
  formData: FormData
): Promise<CancelKnowledgeSourceSyncState> {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) {
    return { ok: false, error: gate.error }
  }
  const session = gate.session

  const sourceId = formData.get("sourceId")
  const runId = formData.get("runId")
  if (typeof sourceId !== "string" || sourceId.length === 0) {
    return { ok: false, error: "Missing source id." }
  }

  // Workflow DevKit cancellation API is not exposed in this repository yet.
  // This writes an explicit cancel-request event for operators and dashboards.
  after(() =>
    writeIamAuditEventFromNextHeaders({
      action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_CANCEL,
      organizationId: session.organizationId,
      actorUserId: session.userId,
      actorSessionId: session.sessionId,
      resourceType: "knowledge.source",
      resourceId: sourceId,
      metadata: {
        runId: typeof runId === "string" ? runId : undefined,
        status: "cancel_requested",
      },
    })
  )

  revalidatePath(
    toLocaleOrgAdminRevalidatePattern("/knowledge/sources"),
    "page"
  )
  return { ok: true }
}

export async function cancelKnowledgeSourceSyncFormAction(
  formData: FormData
): Promise<void> {
  void (await cancelKnowledgeSourceSyncAction(undefined, formData))
}
