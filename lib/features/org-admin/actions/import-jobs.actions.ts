"use server"

import { revalidatePath } from "next/cache"

import {
  enqueueOrgImportJobWorkflowRun,
  importJobRunPayloadSchema,
} from "#features/execution"
import {
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"
import { requireTenantAuthority } from "#features/erp-rbac/server"
import { toLocaleOrgAdminRevalidatePattern } from "#lib/i18n/locales.shared"

import { IMPORT_MAX_ROWS_PER_JOB, isImportAdapterId } from "../constants"
import { digestCsv, parseCsv } from "../data/csv-parser.shared"
import {
  insertImportJob,
  updateImportJobState,
} from "../data/import-jobs.mutations"
import { getOrgImportJob } from "../data/import-jobs.queries"
import { getImportAdapter } from "../data/member-invite.adapter.server"
import { importJobInputSchema } from "../schemas/import-job-input.schema"
import type { OrgImportAdapterId, OrgImportJobSummary } from "../types"

export type ImportJobActionState =
  | {
      ok: true
      job: OrgImportJobSummary
      message?: string
    }
  | {
      ok: false
      error: string
      fieldErrors?: { csvText?: string; adapter?: string }
    }
  | null

async function requireOrgAdmin() {
  const gate = await requireTenantAuthority([
    "tenant_owner",
    "tenant_key_admin",
    "tenant_support_admin",
  ])
  if (!gate.ok) return { ok: false as const, error: gate.error }
  return { ok: true as const, session: gate.session }
}

/**
 * Revalidates at **layout** scope so the org-admin rail's `integrations`
 * pressure badge (Phase 2 — `getOrgAdminRailPressureCounts`) refreshes
 * after every import-job mutation. The integrations page revalidation
 * comes along for free since it sits below the layout.
 */
function revalidateIntegrations() {
  revalidatePath(toLocaleOrgAdminRevalidatePattern("/integrations"), "layout")
}

/**
 * Tier B (admin-guarded master data) — `org.import.job.create`.
 * Parses + validates CSV, stages rows in `import_job_row`, and stores any
 * adapter-level validation failures up front. State stays `uploaded` until
 * `runOrgImportJob` is called.
 */
export async function createOrgImportJob(
  _prev: ImportJobActionState,
  formData: FormData
): Promise<ImportJobActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const parsed = importJobInputSchema.safeParse({
    adapter: formData.get("adapter"),
    csvText: formData.get("csvText"),
    filename:
      typeof formData.get("filename") === "string"
        ? (formData.get("filename") as string)
        : undefined,
  })
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      error: "Fix the highlighted fields and try again.",
      fieldErrors: {
        csvText: flat.csvText?.[0],
        adapter: flat.adapter?.[0],
      },
    }
  }

  const adapterId = parsed.data.adapter
  if (!isImportAdapterId(adapterId)) {
    return { ok: false, error: "Unknown adapter." }
  }
  const adapter = getImportAdapter(adapterId)
  if (!adapter) {
    return { ok: false, error: "Adapter not registered." }
  }

  const csvResult = parseCsv(parsed.data.csvText)
  if (!csvResult.ok) {
    return { ok: false, error: csvResult.error }
  }

  for (const required of adapter.requiredHeaders) {
    if (!csvResult.headers.includes(required)) {
      return {
        ok: false,
        error: `CSV header missing required column "${required}"`,
        fieldErrors: { csvText: `Missing column: ${required}` },
      }
    }
  }

  if (csvResult.rows.length === 0) {
    return { ok: false, error: "CSV has no data rows." }
  }
  if (csvResult.rows.length > IMPORT_MAX_ROWS_PER_JOB) {
    return {
      ok: false,
      error: `Too many rows (max ${IMPORT_MAX_ROWS_PER_JOB} per job).`,
    }
  }

  const stagedRows: Array<{
    rowIndex: number
    payload: Record<string, unknown>
    state: "pending" | "failed"
  }> = []
  const stagedFailures: Array<{
    rowIndex?: number
    code: string
    message: string
    field?: string
  }> = []

  csvResult.rows.forEach((record, index) => {
    const rowIndex = index + 1
    const result = adapter.parseRow(record)
    if (result.ok) {
      stagedRows.push({
        rowIndex,
        payload: result.payload as Record<string, unknown>,
        state: "pending",
      })
    } else {
      stagedRows.push({
        rowIndex,
        payload: record,
        state: "failed",
      })
      stagedFailures.push({
        rowIndex,
        code: result.code ?? "validation",
        message: result.error,
        field: result.field,
      })
    }
  })

  const inputDigest = await digestCsv(parsed.data.csvText)

  const inserted = await insertImportJob({
    organizationId: session.organizationId,
    adapter: adapterId,
    state: "uploaded",
    totalRows: stagedRows.length,
    inputDigest,
    createdByUserId: session.userId,
    metadata: parsed.data.filename ? { filename: parsed.data.filename } : null,
    rows: stagedRows,
    failures: stagedFailures,
  })

  // Bring the job's failureCount in sync with staged validation failures.
  const job = await updateImportJobState({
    organizationId: session.organizationId,
    jobId: inserted.jobId,
    state: "uploaded",
    failureDelta: stagedFailures.length,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "org.import.job.create",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "import.job",
    resourceId: inserted.jobId,
    metadata: {
      adapter: adapterId,
      totalRows: stagedRows.length,
      validationFailures: stagedFailures.length,
    },
  })

  revalidateIntegrations()
  return job
    ? { ok: true, job }
    : { ok: false, error: "Job not visible after insert." }
}

/**
 * Tier A — `org.import.job.run`. Transitions to `running`, audits the run, then
 * enqueues a durable Workflow DevKit pipeline that applies `pending` rows in
 * batches (`lib/features/org-admin/data/import-job-run.workflow.ts`). Tenant
 * and admin guards stay here; workflow arguments use only Server Action–trusted IDs.
 */
export async function runOrgImportJob(
  _prev: ImportJobActionState,
  formData: FormData
): Promise<ImportJobActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const jobId = formData.get("jobId")
  if (typeof jobId !== "string" || jobId.length === 0) {
    return { ok: false, error: "Missing job id." }
  }

  const job = await getOrgImportJob(session.organizationId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  if (job.state !== "uploaded") {
    return { ok: false, error: `Job is not runnable (state: ${job.state}).` }
  }

  const adapter = getImportAdapter(job.adapter as OrgImportAdapterId)
  if (!adapter) return { ok: false, error: "Adapter not registered." }

  await updateImportJobState({
    organizationId: session.organizationId,
    jobId,
    state: "running",
  })

  await writeIamAuditEventFromNextHeaders({
    action: "org.import.job.run",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "import.job",
    resourceId: jobId,
  })

  const payload = importJobRunPayloadSchema.parse({
    jobId,
    organizationId: session.organizationId,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
  })

  await enqueueOrgImportJobWorkflowRun(payload)

  const runningJob = await getOrgImportJob(session.organizationId, jobId)

  revalidateIntegrations()
  return runningJob
    ? { ok: true, job: runningJob }
    : { ok: false, error: "Job state could not be loaded." }
}

/** Tier B — `org.import.job.cancel`. Marks an `uploaded` job as cancelled. */
export async function cancelOrgImportJob(
  _prev: ImportJobActionState,
  formData: FormData
): Promise<ImportJobActionState> {
  const gate = await requireOrgAdmin()
  if (!gate.ok) return { ok: false, error: gate.error }
  const { session } = gate

  const jobId = formData.get("jobId")
  if (typeof jobId !== "string" || jobId.length === 0) {
    return { ok: false, error: "Missing job id." }
  }

  const job = await getOrgImportJob(session.organizationId, jobId)
  if (!job) return { ok: false, error: "Job not found." }
  if (job.state === "completed" || job.state === "cancelled") {
    return { ok: false, error: `Job already ${job.state}.` }
  }

  const updated = await updateImportJobState({
    organizationId: session.organizationId,
    jobId,
    state: "cancelled",
    completedAt: new Date(),
  })

  await writeIamAuditEventFromNextHeaders({
    action: "org.import.job.cancel",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "import.job",
    resourceId: jobId,
  })

  revalidateIntegrations()
  return updated
    ? { ok: true, job: updated }
    : { ok: false, error: "Job state could not be loaded." }
}
