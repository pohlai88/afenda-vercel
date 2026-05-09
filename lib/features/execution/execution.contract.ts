/**
 * Operational execution — durable runs (Workflow DevKit), not Lynx and not ERP truth.
 * @see AGENTS.md — Operational execution (Workflow DevKit)
 */
export const EXECUTION_MODULE_ID = "execution" as const

/** IAM audit actions for governed execution lifecycle (metadata carries job/run correlation). */
export const EXECUTION_AUDIT_ACTIONS = {
  IMPORT_JOB_RUN_STARTED: "erp.execution.import_job.run.started",
  IMPORT_JOB_RUN_COMPLETED: "erp.execution.import_job.run.completed",
  IMPORT_JOB_RUN_FAILED: "erp.execution.import_job.run.failed",
  ONETHING_RECURRENCE_RUN_STARTED:
    "erp.execution.onething_recurrence.run.started",
  ONETHING_RECURRENCE_RUN_COMPLETED:
    "erp.execution.onething_recurrence.run.completed",
  ONETHING_RECURRENCE_RUN_SKIPPED:
    "erp.execution.onething_recurrence.run.skipped",
  ONETHING_RECURRENCE_RUN_FAILED:
    "erp.execution.onething_recurrence.run.failed",
  ONETHING_REMINDER_RUN_STARTED: "erp.execution.onething_reminder.run.started",
  ONETHING_REMINDER_RUN_COMPLETED:
    "erp.execution.onething_reminder.run.completed",
  ONETHING_REMINDER_RUN_FAILED: "erp.execution.onething_reminder.run.failed",
} as const

export type ExecutionAuditAction =
  (typeof EXECUTION_AUDIT_ACTIONS)[keyof typeof EXECUTION_AUDIT_ACTIONS]
