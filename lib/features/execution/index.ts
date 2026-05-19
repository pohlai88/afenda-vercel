import type { runWithNodeOtelSpan as RunWithNodeOtelSpanFn } from "#lib/observability/otel-span.server"
import type { start as WorkflowStartFn } from "workflow/api"

import type { ImportJobRunPayload } from "./schemas/import-job-run-payload.schema"
import type { KnowledgeEvalRunPayload } from "./schemas/knowledge-eval-run-payload.schema"
import type { KnowledgeSourceSyncPayload } from "./schemas/knowledge-source-sync-payload.schema"
import type { PlannerRecurrenceRunPayload } from "./schemas/planner-recurrence-run-payload.schema"
import type { PlannerReminderRunPayload } from "./schemas/planner-reminder-run-payload.schema"
import type { PayrollFinalizePayload } from "./schemas/payroll-finalize-payload.schema"
import type { SignatureSealPayload } from "./schemas/signature-seal-payload.schema"
import type { HrmImportApplyPayload } from "./schemas/hrm-import-apply-payload.schema"

export {
  EXECUTION_AUDIT_ACTIONS,
  EXECUTION_MODULE_ID,
  type ExecutionAuditAction,
} from "./execution.contract"
export {
  importJobRunPayloadSchema,
  type ImportJobRunPayload,
} from "./schemas/import-job-run-payload.schema"
export {
  knowledgeEvalRunPayloadSchema,
  type KnowledgeEvalRunPayload,
} from "./schemas/knowledge-eval-run-payload.schema"
export {
  knowledgeSourceSyncPayloadSchema,
  type KnowledgeSourceSyncPayload,
} from "./schemas/knowledge-source-sync-payload.schema"
export {
  plannerRecurrenceRunPayloadSchema,
  type PlannerRecurrenceRunPayload,
} from "./schemas/planner-recurrence-run-payload.schema"
export {
  plannerReminderRunPayloadSchema,
  type PlannerReminderRunPayload,
} from "./schemas/planner-reminder-run-payload.schema"
export {
  payrollFinalizePayloadSchema,
  type PayrollFinalizePayload,
} from "./schemas/payroll-finalize-payload.schema"
export {
  signatureSealPayloadSchema,
  type SignatureSealPayload,
} from "./schemas/signature-seal-payload.schema"
export {
  hrmImportApplyPayloadSchema,
  type HrmImportApplyPayload,
} from "./schemas/hrm-import-apply-payload.schema"

/**
 * Shared Workflow DevKit + OTel runtime resolved lazily on first enqueue.
 *
 * Why a module-scoped singleton instead of static top-level imports:
 *   - This barrel is imported by edge/client-shared files (`compliance-timeline.shared.ts`,
 *     type-only imports from `lib/features/knowledge/data/*.workflow.ts`, etc.), so static
 *     `import "workflow/api"` or `"#lib/observability/otel-span.server"` would pull
 *     server-only code into client/edge bundles and break the ADR-0030 barrel contract.
 *   - The previous per-call `await import(...)` paid the dynamic-import resolution cost
 *     on EVERY enqueue (8 helpers × every Server Action / cron tick). The `@vercel/queue`
 *     and `@opentelemetry/instrumentation` packages are listed in `serverExternalPackages`
 *     (next.config.ts), so each dynamic import goes through native Node `require()` — fast
 *     after warm-up, but non-zero on cold paths and amplified by being inside the OTel span.
 *
 * One `loadEnqueueRuntime()` call per Node worker; subsequent enqueues skip import resolution.
 */
type EnqueueRuntime = {
  start: typeof WorkflowStartFn
  runWithNodeOtelSpan: typeof RunWithNodeOtelSpanFn
}

let enqueueRuntimePromise: Promise<EnqueueRuntime> | null = null

function loadEnqueueRuntime(): Promise<EnqueueRuntime> {
  if (enqueueRuntimePromise === null) {
    enqueueRuntimePromise = Promise.all([
      import("workflow/api"),
      import("#lib/observability/otel-span.server"),
    ]).then(([{ start }, { runWithNodeOtelSpan }]) => ({
      start,
      runWithNodeOtelSpan,
    }))
  }
  return enqueueRuntimePromise
}

/**
 * Wraps a workflow start in an OTel span. The runtime is resolved BEFORE the span begins so
 * span duration measures only the actual `start()` round-trip, not module resolution. This
 * gives accurate enqueue-latency telemetry on Vercel Observability dashboards.
 */
async function enqueueWorkflowWithOtelSpan(
  spanName: string,
  organizationId: string,
  attributes: Record<string, string | number | boolean | undefined>,
  run: (start: EnqueueRuntime["start"]) => Promise<void>
): Promise<void> {
  const { start, runWithNodeOtelSpan } = await loadEnqueueRuntime()
  await runWithNodeOtelSpan(
    spanName,
    {
      "erp.module": "execution",
      "erp.organization.id": organizationId,
      ...attributes,
    },
    () => run(start)
  )
}

/**
 * Enqueues a durable import-job apply run. The workflow implementation lives next to
 * org-admin ingestion (`lib/features/org-admin/data/import-job-run.workflow.ts`);
 * `import-job-run-entry` keeps it off the org-admin public barrel (client-safe exports).
 */
export async function enqueueOrgImportJobWorkflowRun(
  payload: ImportJobRunPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.import_job.enqueue",
    payload.organizationId,
    {
      "erp.workflow": "import_job",
      "erp.job.id": payload.jobId,
    },
    async (start) => {
      const { runOrgImportJobWorkflow } = await import(
        "./data/import-job-run-entry"
      )
      await start(runOrgImportJobWorkflow, [payload])
    }
  )
}

/**
 * Enqueues durable payroll preview computation for every draft run in a period.
 * Workflow implementation: `lib/features/hrm/payroll-compensation/payroll-processing/data/payroll-finalize.workflow.ts`.
 */
export async function enqueueHrmSignatureSealWorkflowRun(
  payload: SignatureSealPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.hrm_signature_seal.enqueue",
    payload.organizationId,
    {
      "erp.workflow": "hrm_signature_seal",
      "erp.signature.request.id": payload.requestId,
    },
    async (start) => {
      const { hrmSignatureSealWorkflow } = await import(
        "./data/signature-seal-run-entry"
      )
      await start(hrmSignatureSealWorkflow, [payload])
    }
  )
}

export async function enqueueHrmImportApplyWorkflowRun(
  payload: HrmImportApplyPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.hrm_import_apply.enqueue",
    payload.organizationId,
    {
      "erp.workflow": "hrm_import_apply",
      "erp.import.session.id": payload.sessionId,
    },
    async (start) => {
      const { hrmImportApplyWorkflow } = await import(
        "./data/hrm-import-apply-run-entry"
      )
      await start(hrmImportApplyWorkflow, [payload])
    }
  )
}

export async function enqueuePayrollFinalizeWorkflowRun(
  payload: PayrollFinalizePayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.payroll_finalize.enqueue",
    payload.organizationId,
    {
      "erp.workflow": "payroll_finalize",
      "erp.payroll.period.id": payload.periodId,
    },
    async (start) => {
      const { payrollFinalizeWorkflow } = await import(
        "./data/payroll-finalize-run-entry"
      )
      await start(payrollFinalizeWorkflow, [payload])
    }
  )
}

export async function enqueueKnowledgeEvalWorkflowRun(
  payload: KnowledgeEvalRunPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.knowledge_eval.enqueue",
    payload.organizationId,
    {
      "erp.workflow": "knowledge_eval",
      "erp.eval_set.id": payload.evalSetId,
    },
    async (start) => {
      const { runKnowledgeEvalWorkflow } = await import(
        "./data/knowledge-eval-run-entry"
      )
      await start(runKnowledgeEvalWorkflow, [payload])
    }
  )
}

export async function enqueueKnowledgeSourceSyncWorkflowRun(
  payload: KnowledgeSourceSyncPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.knowledge_source_sync.enqueue",
    payload.organizationId,
    {
      "erp.workflow": "knowledge_source_sync",
      "erp.knowledge.run.id": payload.runId,
      "erp.knowledge.source.id": payload.sourceId,
    },
    async (start) => {
      const { runKnowledgeSourceSyncWorkflow } = await import(
        "./data/knowledge-source-sync-entry"
      )
      await start(runKnowledgeSourceSyncWorkflow, [payload])
    }
  )
}

export async function enqueuePlannerRecurrenceWorkflowRun(
  payload: PlannerRecurrenceRunPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.planner_recurrence.enqueue",
    payload.organizationId,
    { "erp.workflow": "planner_recurrence" },
    async (start) => {
      const { runPlannerRecurrenceWorkflow } = await import(
        "./data/planner-recurrence-run-entry"
      )
      await start(runPlannerRecurrenceWorkflow, [payload])
    }
  )
}

export async function enqueuePlannerReminderWorkflowRun(
  payload: PlannerReminderRunPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.planner_reminder.enqueue",
    payload.organizationId,
    { "erp.workflow": "planner_reminder" },
    async (start) => {
      const { runPlannerReminderWorkflow } = await import(
        "./data/planner-reminder-run-entry"
      )
      await start(runPlannerReminderWorkflow, [payload])
    }
  )
}
