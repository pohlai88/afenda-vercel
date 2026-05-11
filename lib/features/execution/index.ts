import type { ImportJobRunPayload } from "./schemas/import-job-run-payload.schema"
import type { KnowledgeEvalRunPayload } from "./schemas/knowledge-eval-run-payload.schema"
import type { KnowledgeSourceSyncPayload } from "./schemas/knowledge-source-sync-payload.schema"
import type { PlannerRecurrenceRunPayload } from "./schemas/planner-recurrence-run-payload.schema"
import type { PlannerReminderRunPayload } from "./schemas/planner-reminder-run-payload.schema"
import type { PayrollFinalizePayload } from "./schemas/payroll-finalize-payload.schema"

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

async function enqueueWorkflowWithOtelSpan(
  spanName: string,
  organizationId: string,
  attributes: Record<string, string | number | boolean | undefined>,
  run: () => Promise<void>
): Promise<void> {
  const { runWithNodeOtelSpan } = await import("#lib/otel-span.server")
  await runWithNodeOtelSpan(
    spanName,
    {
      "erp.module": "execution",
      "erp.organization.id": organizationId,
      ...attributes,
    },
    run
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
    async () => {
      const [{ runOrgImportJobWorkflow }, { start }] = await Promise.all([
        import("./data/import-job-run-entry"),
        import("workflow/api"),
      ])
      await start(runOrgImportJobWorkflow, [payload])
    }
  )
}

/**
 * Enqueues durable payroll preview computation for every draft run in a period.
 * Workflow implementation: `lib/features/hrm/data/payroll-finalize.workflow.ts`.
 */
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
    async () => {
      const [{ payrollFinalizeWorkflow }, { start }] = await Promise.all([
        import("./data/payroll-finalize-run-entry"),
        import("workflow/api"),
      ])
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
    async () => {
      const [{ runKnowledgeEvalWorkflow }, { start }] = await Promise.all([
        import("./data/knowledge-eval-run-entry"),
        import("workflow/api"),
      ])
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
    async () => {
      const [{ runKnowledgeSourceSyncWorkflow }, { start }] = await Promise.all(
        [import("./data/knowledge-source-sync-entry"), import("workflow/api")]
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
    async () => {
      const [{ runPlannerRecurrenceWorkflow }, { start }] = await Promise.all([
        import("./data/planner-recurrence-run-entry"),
        import("workflow/api"),
      ])
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
    async () => {
      const [{ runPlannerReminderWorkflow }, { start }] = await Promise.all([
        import("./data/planner-reminder-run-entry"),
        import("workflow/api"),
      ])
      await start(runPlannerReminderWorkflow, [payload])
    }
  )
}
