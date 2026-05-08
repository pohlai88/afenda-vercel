import type { KnowledgeSourceSyncPayload } from "#features/execution"
import {
  KNOWLEDGE_AUDIT_ACTIONS,
  type KnowledgeSourceKind,
} from "#features/knowledge"
import { writeIamAuditEvent } from "#lib/auth"

import { getKnowledgeSourceAdapter } from "./source-adapter-registry.server"
import { getKnowledgeSourceForOrganization } from "./source.queries.server"
import { getKnowledgeOrgSetting } from "./settings.queries.server"
import { touchKnowledgeSourceLastSyncedAt } from "./source.mutations.server"
import { commitKnowledgeDocument } from "./pipeline-commit-document.server"
import type { IamAuditSourceSyncMetadata } from "./metadata-contracts.shared"

export async function runKnowledgeSourceSyncWorkflow(
  payload: KnowledgeSourceSyncPayload
) {
  "use workflow"

  try {
    await syncStartedStep(payload)
    await syncDocumentsStep(payload)
    await syncCompletedStep(payload)
  } catch (err) {
    await syncFailedStep(payload, err)
    throw err
  }
}

async function syncStartedStep(payload: KnowledgeSourceSyncPayload) {
  "use step"
  await writeIamAuditEvent({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_START,
    organizationId: payload.organizationId,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    resourceType: "knowledge.source",
    resourceId: payload.sourceId,
    metadata: {
      runId: payload.runId,
      sourceId: payload.sourceId,
      documentsTotal: 0,
      documentsChanged: 0,
      durationMs: 0,
    } satisfies IamAuditSourceSyncMetadata,
  })
}

async function syncDocumentsStep(payload: KnowledgeSourceSyncPayload) {
  "use step"
  const startedAt = Date.now()
  const source = await getKnowledgeSourceForOrganization(
    payload.organizationId,
    payload.sourceId
  )
  if (!source || !source.enabled) {
    return
  }
  const adapter = getKnowledgeSourceAdapter(source.kind as KnowledgeSourceKind)
  if (!adapter) {
    throw new Error(`Source adapter not found for kind ${source.kind}`)
  }
  const parsed = adapter.configSchema.safeParse(source.config)
  if (!parsed.success) {
    throw new Error("Invalid knowledge source config")
  }
  const setting = await getKnowledgeOrgSetting(payload.organizationId)
  let totalDocuments = 0
  let changedDocuments = 0
  for await (const doc of adapter.listDocuments(
    { organizationId: payload.organizationId },
    parsed.data
  )) {
    totalDocuments += 1
    const res = await commitKnowledgeDocument({
      organizationId: payload.organizationId,
      sourceId: source.id,
      actorUserId: payload.actorUserId,
      actorSessionId: payload.actorSessionId,
      document: doc,
      enforceZdr: setting?.enforceZdr ?? false,
    })
    if (res.changed) changedDocuments += 1
  }

  await touchKnowledgeSourceLastSyncedAt({
    organizationId: payload.organizationId,
    sourceId: payload.sourceId,
    at: new Date(),
  })

  const completionMetadata: IamAuditSourceSyncMetadata = {
    runId: payload.runId,
    sourceId: payload.sourceId,
    documentsTotal: totalDocuments,
    documentsChanged: changedDocuments,
    durationMs: Date.now() - startedAt,
  }
  await writeIamAuditEvent({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_COMPLETE,
    organizationId: payload.organizationId,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    resourceType: "knowledge.source",
    resourceId: payload.sourceId,
    metadata: completionMetadata,
  })
}

async function syncCompletedStep(payload: KnowledgeSourceSyncPayload) {
  "use step"
  const finalMetadata: IamAuditSourceSyncMetadata = {
    runId: payload.runId,
    sourceId: payload.sourceId,
    documentsTotal: 0,
    documentsChanged: 0,
    durationMs: 0,
  }
  await writeIamAuditEvent({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_COMPLETE,
    organizationId: payload.organizationId,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    resourceType: "knowledge.source",
    resourceId: payload.sourceId,
    metadata: finalMetadata,
  })
}

async function syncFailedStep(
  payload: KnowledgeSourceSyncPayload,
  error: unknown
) {
  "use step"
  const failureMetadata: IamAuditSourceSyncMetadata = {
    runId: payload.runId,
    sourceId: payload.sourceId,
    documentsTotal: 0,
    documentsChanged: 0,
    durationMs: 0,
    reason: error instanceof Error ? error.message : "Sync failed",
  }
  await writeIamAuditEvent({
    action: KNOWLEDGE_AUDIT_ACTIONS.SOURCE_SYNC_FAIL,
    organizationId: payload.organizationId,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    resourceType: "knowledge.source",
    resourceId: payload.sourceId,
    metadata: failureMetadata,
  })
}
