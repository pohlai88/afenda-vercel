import type { ImportJobRunPayload } from "./schemas/import-job-run-payload.schema"
import type { KnowledgeEvalRunPayload } from "./schemas/knowledge-eval-run-payload.schema"
import type { KnowledgeSourceSyncPayload } from "./schemas/knowledge-source-sync-payload.schema"
import type { OneThingRecurrenceRunPayload } from "./schemas/onething-recurrence-run-payload.schema"
import type { OneThingReminderRunPayload } from "./schemas/onething-reminder-run-payload.schema"

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
  onethingRecurrenceRunPayloadSchema,
  type OneThingRecurrenceRunPayload,
} from "./schemas/onething-recurrence-run-payload.schema"
export {
  onethingReminderRunPayloadSchema,
  type OneThingReminderRunPayload,
} from "./schemas/onething-reminder-run-payload.schema"

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

export async function enqueueOneThingRecurrenceWorkflowRun(
  payload: OneThingRecurrenceRunPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.onething_recurrence.enqueue",
    payload.organizationId,
    { "erp.workflow": "onething_recurrence" },
    async () => {
      const [{ runOneThingRecurrenceWorkflow }, { start }] = await Promise.all([
        import("./data/onething-recurrence-run-entry"),
        import("workflow/api"),
      ])
      await start(runOneThingRecurrenceWorkflow, [payload])
    }
  )
}

export async function enqueueOneThingReminderWorkflowRun(
  payload: OneThingReminderRunPayload
): Promise<void> {
  await enqueueWorkflowWithOtelSpan(
    "execution.workflow.onething_reminder.enqueue",
    payload.organizationId,
    { "erp.workflow": "onething_reminder" },
    async () => {
      const [{ runOneThingReminderWorkflow }, { start }] = await Promise.all([
        import("./data/onething-reminder-run-entry"),
        import("workflow/api"),
      ])
      await start(runOneThingReminderWorkflow, [payload])
    }
  )
}
