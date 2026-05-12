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
  /**
   * Phase 3M — first system-observed aging crossing. Emitted by the
   * aging watch cron when an evidence row in `submitted` state has been
   * waiting for bureau acknowledgement for at least
   * `COMPLIANCE_OPERATIONAL_HEALTH_AGING.STUCK_DAYS`.
   *
   * Per Phase 3O — this is the LOWEST severity tier. Higher tiers
   * (`escalated`, `critical`) emit independently as the row continues
   * to age. Each tier is idempotent per evidence row (`resourceId`),
   * but the three tiers together let the audit chain reflect the FULL
   * severity history of how stuck a row has gotten.
   *
   * The system itself is the temporal authority — `actorUserId` and
   * `actorSessionId` are both `null` to signal an autonomous
   * observation, not a human action.
   */
  STATUTORY_SUBMISSION_AGING_DETECTED:
    "erp.execution.statutory_submission.aging.detected",
  /**
   * Phase 3O — middle severity tier. Emitted when a stuck row crosses
   * `COMPLIANCE_OPERATIONAL_HEALTH_AGING.ESCALATED_DAYS` (default 14)
   * — operationally meaningful as "needs management attention", not
   * just "HR follow-up". A row that has BOTH `detected` and
   * `escalated` rows in the audit chain has been stuck through at
   * least one weekly review cycle.
   *
   * Idempotent per evidence row (one row per tier, ever). A row that
   * is 20 days stuck on its first observation gets BOTH `detected`
   * and `escalated` audits in the same tick — the system records
   * every tier it observed crossed, not just the most recent one.
   */
  STATUTORY_SUBMISSION_AGING_ESCALATED:
    "erp.execution.statutory_submission.aging.escalated",
  /**
   * Phase 3O — highest severity tier. Emitted when a stuck row crosses
   * `COMPLIANCE_OPERATIONAL_HEALTH_AGING.CRITICAL_DAYS` (default 30)
   * — bureau replies typically arrive within 3-5 working days, so a
   * full month of silence is regulator-visible exposure. Future Orbit
   * pressure projection should treat the existence of a `critical`
   * audit row on an evidence id as a high-urgency signal regardless
   * of bucket count.
   *
   * Idempotent per evidence row (one row per tier, ever).
   */
  STATUTORY_SUBMISSION_AGING_CRITICAL:
    "erp.execution.statutory_submission.aging.critical",
} as const

export type ExecutionAuditAction =
  (typeof EXECUTION_AUDIT_ACTIONS)[keyof typeof EXECUTION_AUDIT_ACTIONS]
