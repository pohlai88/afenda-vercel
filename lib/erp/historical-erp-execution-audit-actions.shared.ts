/**
 * Historical IAM audit action strings — **read-only**.
 *
 * Action names previously written by the retired OneThing and iThink runtimes,
 * plus the `erp.execution.onething_*` workflow lifecycle namespace. No active
 * code path in Afenda emits these strings; they exist for one purpose: keep
 * historical {@link iamAuditEvent} rows renderable by
 * {@link describeAuditEvent7W1H} via the shared trailing-verb extractor.
 *
 * **Do not add new entries here.** New audit actions live under
 * `erp.planner.*`, `erp.execution.planner_*`, or other active namespaces (see
 * {@link AGENTS.md} → IAM audit policy (ERP)).
 *
 * Doctrine archive: `docs/_draft/ithink_draft_v1_deprecated.md`.
 */

export const HISTORICAL_ERP_ONETHING_AUDIT_ACTIONS = [
  "erp.onething.consequence.create",
  "erp.onething.consequence.resolve",
  "erp.onething.consequence.update",
  "erp.onething.consequence.deprecate",
  "erp.onething.consequence.state_transition",
  "erp.onething.consequence.prediction_accepted",
  "erp.onething.consequence.prediction_cleared",
  // Early iteration before the `.consequence.` interior:
  "erp.onething.onething.create",
  "erp.onething.onething.resolve",
  "erp.onething.onething.update",
  "erp.onething.onething.deprecate",
  "erp.onething.onething.state_transition",
  "erp.onething.onething.prediction_accepted",
  "erp.onething.onething.prediction_cleared",
] as const

export const HISTORICAL_ERP_ITHINK_AUDIT_ACTIONS = [
  "erp.ithink.consequence.create",
  "erp.ithink.consequence.update",
  "erp.ithink.consequence.resolve",
  "erp.ithink.consequence.complete",
  "erp.ithink.consequence.snooze",
  "erp.ithink.consequence.reopen",
  "erp.ithink.consequence.deprecate",
  "erp.ithink.consequence.delete",
  "erp.ithink.comment.create",
  "erp.ithink.attachment.create",
] as const

export const HISTORICAL_ERP_EXECUTION_ONETHING_AUDIT_ACTIONS = [
  "erp.execution.onething_recurrence.run.started",
  "erp.execution.onething_recurrence.run.completed",
  "erp.execution.onething_recurrence.run.skipped",
  "erp.execution.onething_recurrence.run.failed",
  "erp.execution.onething_reminder.run.started",
  "erp.execution.onething_reminder.run.completed",
  "erp.execution.onething_reminder.run.failed",
] as const

/** Union of every historical audit string still legitimately present in `iam_audit_event`. */
export const HISTORICAL_ERP_LEGACY_AUDIT_ACTIONS = [
  ...HISTORICAL_ERP_ONETHING_AUDIT_ACTIONS,
  ...HISTORICAL_ERP_ITHINK_AUDIT_ACTIONS,
  ...HISTORICAL_ERP_EXECUTION_ONETHING_AUDIT_ACTIONS,
] as const

export type HistoricalErpLegacyAuditAction =
  (typeof HISTORICAL_ERP_LEGACY_AUDIT_ACTIONS)[number]

const HISTORICAL_SET = new Set<string>(HISTORICAL_ERP_LEGACY_AUDIT_ACTIONS)

export function isHistoricalErpLegacyAuditAction(
  action: string
): action is HistoricalErpLegacyAuditAction {
  return HISTORICAL_SET.has(action)
}
