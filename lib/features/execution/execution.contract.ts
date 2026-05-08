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
  TODO_RECURRENCE_RUN_STARTED: "erp.execution.todo_recurrence.run.started",
  TODO_RECURRENCE_RUN_COMPLETED: "erp.execution.todo_recurrence.run.completed",
  TODO_RECURRENCE_RUN_FAILED: "erp.execution.todo_recurrence.run.failed",
  TODO_REMINDER_RUN_STARTED: "erp.execution.todo_reminder.run.started",
  TODO_REMINDER_RUN_COMPLETED: "erp.execution.todo_reminder.run.completed",
  TODO_REMINDER_RUN_FAILED: "erp.execution.todo_reminder.run.failed",
} as const

export type ExecutionAuditAction =
  (typeof EXECUTION_AUDIT_ACTIONS)[keyof typeof EXECUTION_AUDIT_ACTIONS]
