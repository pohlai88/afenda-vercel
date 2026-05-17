import type { KnowledgeSourceSyncPayload } from "#features/execution"
import {
  KNOWLEDGE_AUDIT_ACTIONS,
  type KnowledgeSourceKind,
} from "#features/knowledge"
import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import {
  createPlannerSignalLink,
  insertPlannerSignal,
} from "#features/planner/server"
import { writeIamAuditEvent } from "#lib/auth"
import { organizationDashboardPath } from "#lib/dashboard-module-paths"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"

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
  const source = await getKnowledgeSourceForOrganization(
    payload.organizationId,
    payload.sourceId
  )
  const sourceLabel = source?.name ?? payload.sourceId
  const reason = error instanceof Error ? error.message : "Sync failed"
  const orgSlug = await getOrganizationSlugById(payload.organizationId)
  const failureMetadata: IamAuditSourceSyncMetadata = {
    runId: payload.runId,
    sourceId: payload.sourceId,
    documentsTotal: 0,
    documentsChanged: 0,
    durationMs: 0,
    reason,
  }

  const signal = await insertPlannerSignal({
    scope: {
      scopeKind: "organization",
      organizationId: payload.organizationId,
    },
    title: `Knowledge sync failed: ${sourceLabel}`,
    description: reason,
    signalClass: "anomaly",
    actorUserId: payload.actorUserId,
    originatingSystem: "knowledge.sync",
    pressure: {
      urgency: 3,
      impact: 3,
      severity: 3,
      confidence: 4,
      effort: 2,
      escalationLevel: 2,
      temporalProximity: 2,
      ownershipPressure: 2,
    },
  })

  await createPlannerSignalLink({
    scope: {
      scopeKind: "organization",
      organizationId: payload.organizationId,
    },
    signalId: signal.id,
    module: "knowledge",
    entityType: "source",
    entityId: payload.sourceId,
    displayLabel: sourceLabel,
    href: orgSlug ? organizationDashboardPath(orgSlug, "knowledge") : null,
    causalityReason: "Knowledge source sync failed.",
    actorUserId: payload.actorUserId,
  })

  await publishOrgNotificationIfMissing({
    organizationId: payload.organizationId,
    targetUserId: payload.actorUserId ?? null,
    title: `Knowledge sync failed: ${sourceLabel}`,
    body: reason,
    severity: "warning",
    linkedEntityType: "knowledge_source",
    linkedEntityId: payload.sourceId,
    linkedEntityLabel: sourceLabel,
    linkedPath: orgSlug
      ? organizationDashboardPath(orgSlug, "knowledge")
      : null,
  })

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
