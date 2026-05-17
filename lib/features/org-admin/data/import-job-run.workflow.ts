import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { FatalError } from "workflow"

import { EXECUTION_AUDIT_ACTIONS } from "#features/execution"
import { createPlannerSignalFromErpProducer } from "#features/planner/server"
import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { writeIamAuditEvent } from "#lib/auth"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"
import { getOrganizationSlugById } from "#lib/auth/org-slug.server"

import { organizationAdminPath } from "../constants"
import { getImportAdapter } from "./member-invite.adapter.server"
import {
  appendImportFailure,
  markImportRowApplied,
  markImportRowFailed,
  updateImportJobState,
} from "./import-jobs.mutations"
import { getOrgImportJob, listPendingJobRows } from "./import-jobs.queries"
import type { ImportJobRunPayload } from "#features/execution"
import type { OrgImportAdapterId } from "../types"

const BATCH_SIZE = 15

/**
 * Durable import apply: batched steps (retries per batch) over `import_job_row` pending rows.
 * Orchestrator only; tenant + role gates stay in `runOrgImportJob` (Server Action).
 */
export async function runOrgImportJobWorkflow(payload: ImportJobRunPayload) {
  "use workflow"

  try {
    await executionImportJobStartedStep(payload)
    for (;;) {
      const { done } = await applyImportJobBatchStep(payload)
      if (done) break
    }
    await finalizeImportJobAndAuditStep(payload)
    await executionImportJobCompletedStep(payload)
  } catch (err) {
    await executionImportJobFailedStep(payload, err)
    throw err
  }
}

async function executionImportJobStartedStep(payload: ImportJobRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.IMPORT_JOB_RUN_STARTED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "import.job",
    resourceId: payload.jobId,
    metadata: { jobId: payload.jobId },
  })
}

async function applyImportJobBatchStep(payload: ImportJobRunPayload) {
  "use step"

  const job = await getOrgImportJob(payload.organizationId, payload.jobId)
  if (!job) {
    throw new FatalError("Import job not found during workflow step.")
  }
  if (job.state !== "running") {
    return { done: true as const }
  }

  const adapter = getImportAdapter(job.adapter as OrgImportAdapterId)
  if (!adapter) {
    throw new FatalError("Import adapter not registered for job.")
  }

  const pending = await listPendingJobRows(payload.jobId)
  if (pending.length === 0) {
    return { done: true as const }
  }

  const chunk = pending.slice(0, BATCH_SIZE)
  const h = await headers()
  let applied = 0
  let failed = 0

  for (const row of chunk) {
    const result = await adapter.applyRow(
      {
        organizationId: payload.organizationId,
        actorUserId: payload.actorUserId,
        actorSessionId: payload.actorSessionId,
        headers: h,
      },
      row.payload
    )
    if (result.ok) {
      await markImportRowApplied({
        rowId: row.id,
        resourceType: result.resourceType,
        resourceId: result.resourceId,
      })
      applied++
    } else {
      await markImportRowFailed({ rowId: row.id })
      await appendImportFailure({
        jobId: payload.jobId,
        rowId: row.id,
        code: result.code,
        message: result.message,
        field: result.field,
      })
      failed++
    }
  }

  await updateImportJobState({
    organizationId: payload.organizationId,
    jobId: payload.jobId,
    state: "running",
    successDelta: applied,
    failureDelta: failed,
  })

  return { done: false as const }
}

async function finalizeImportJobAndAuditStep(payload: ImportJobRunPayload) {
  "use step"

  const job = await getOrgImportJob(payload.organizationId, payload.jobId)
  if (!job || job.state !== "running") {
    return
  }
  const pending = await listPendingJobRows(payload.jobId)
  if (pending.length > 0) {
    return
  }

  await updateImportJobState({
    organizationId: payload.organizationId,
    jobId: payload.jobId,
    state: "completed",
    completedAt: new Date(),
  })

  const updated = await getOrgImportJob(payload.organizationId, payload.jobId)

  await writeIamAuditEvent({
    action: "org.import.job.complete",
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "import.job",
    resourceId: payload.jobId,
    metadata: updated
      ? { applied: updated.successCount, failed: updated.failureCount }
      : { applied: 0, failed: 0 },
  })

  revalidatePath(toLocaleOrgAdminRevalidatePattern("/integrations"), "page")
}

async function executionImportJobCompletedStep(payload: ImportJobRunPayload) {
  "use step"

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.IMPORT_JOB_RUN_COMPLETED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "import.job",
    resourceId: payload.jobId,
    metadata: { jobId: payload.jobId },
  })
}

async function executionImportJobFailedStep(
  payload: ImportJobRunPayload,
  err: unknown
) {
  "use step"

  const message = err instanceof Error ? err.message : "Workflow failed"
  const orgSlug = await getOrganizationSlugById(payload.organizationId)
  await createPlannerSignalFromErpProducer({
    organizationId: payload.organizationId,
    title: `Import job failed: ${payload.jobId}`,
    description: message,
    signalClass: "anomaly",
    originatingSystem: "org_admin.import",
    module: "org_admin",
    entityType: "import_job",
    entityId: payload.jobId,
    displayLabel: `Import job ${payload.jobId}`,
    href: orgSlug ? organizationAdminPath(orgSlug, "integrations") : null,
    causalityReason: "Import workflow failed.",
    actorUserId: payload.actorUserId,
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
    auditMetadata: {
      jobId: payload.jobId,
      message,
    },
  })

  await publishOrgNotificationIfMissing({
    organizationId: payload.organizationId,
    targetUserId: payload.actorUserId ?? null,
    title: `Import workflow failed: ${payload.jobId}`,
    body: message,
    severity: "critical",
    linkedEntityType: "import_job",
    linkedEntityId: payload.jobId,
    linkedEntityLabel: `Import job ${payload.jobId}`,
    linkedPath: orgSlug ? organizationAdminPath(orgSlug, "integrations") : null,
  })

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.IMPORT_JOB_RUN_FAILED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "import.job",
    resourceId: payload.jobId,
    metadata: { jobId: payload.jobId, message },
  })

  const job = await getOrgImportJob(payload.organizationId, payload.jobId)
  if (job?.state === "running") {
    await updateImportJobState({
      organizationId: payload.organizationId,
      jobId: payload.jobId,
      state: "failed",
      completedAt: new Date(),
    })
  }

  revalidatePath(toLocaleOrgAdminRevalidatePattern("/integrations"), "page")
}
