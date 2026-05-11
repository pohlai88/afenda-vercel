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
  PLANNER_RECURRENCE_RUN_STARTED:
    "erp.execution.planner_recurrence.run.started",
  PLANNER_RECURRENCE_RUN_COMPLETED:
    "erp.execution.planner_recurrence.run.completed",
  PLANNER_RECURRENCE_RUN_SKIPPED:
    "erp.execution.planner_recurrence.run.skipped",
  PLANNER_RECURRENCE_RUN_FAILED: "erp.execution.planner_recurrence.run.failed",
  PLANNER_REMINDER_RUN_STARTED: "erp.execution.planner_reminder.run.started",
  PLANNER_REMINDER_RUN_COMPLETED:
    "erp.execution.planner_reminder.run.completed",
  PLANNER_REMINDER_RUN_FAILED: "erp.execution.planner_reminder.run.failed",
  PAYROLL_FINALIZE_RUN_FAILED: "erp.execution.payroll_finalize.run.failed",
  STATUTORY_SUBMISSION_DELIVERY_FAILED:
    "erp.execution.statutory_submission.delivery.failed",
  STATUTORY_SUBMISSION_RETRY_ATTEMPTED:
    "erp.execution.statutory_submission.retry.attempted",
  STATUTORY_SUBMISSION_RETRY_EXHAUSTED:
    "erp.execution.statutory_submission.retry.exhausted",
} as const

export type ExecutionAuditAction =
  (typeof EXECUTION_AUDIT_ACTIONS)[keyof typeof EXECUTION_AUDIT_ACTIONS]
