import type { ImportJobRunPayload } from "./schemas/import-job-run-payload.schema"

export {
  EXECUTION_AUDIT_ACTIONS,
  EXECUTION_MODULE_ID,
  type ExecutionAuditAction,
} from "./execution.contract"
export {
  importJobRunPayloadSchema,
  type ImportJobRunPayload,
} from "./schemas/import-job-run-payload.schema"

/**
 * Enqueues a durable import-job apply run. The workflow implementation lives next to
 * org-admin ingestion (`lib/features/org-admin/data/import-job-run.workflow.ts`);
 * `import-job-run-entry` keeps it off the org-admin public barrel (client-safe exports).
 */
export async function enqueueOrgImportJobWorkflowRun(
  payload: ImportJobRunPayload
): Promise<void> {
  const [{ runOrgImportJobWorkflow }, { start }] = await Promise.all([
    import("./data/import-job-run-entry"),
    import("workflow/api"),
  ])
  await start(runOrgImportJobWorkflow, [payload])
}
