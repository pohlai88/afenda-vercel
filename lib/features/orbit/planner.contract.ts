/**
 * Canonical Orbit / planner module contract — audit strings, module id.
 * Commands emit `erp.planner.*` via {@link buildPlannerAuditAction}; this file
 * is the single registry for literals + tests (see ADR-0006).
 */

export const PLANNER_MODULE_ID = "planner" as const

export const PLANNER_AUDIT_PREFIX = "erp.planner" as const

/**
 * Every `erp.planner.<object>.<verb>` string currently emitted from planner
 * Server Actions / integrations. Keys are stable IDs for tests and docs.
 */
export const PLANNER_AUDIT_ACTIONS = {
  assignmentAssign: "erp.planner.assignment.assign",
  attachmentAttach: "erp.planner.attachment.attach",
  commentComment: "erp.planner.comment.comment",
  itemCreate: "erp.planner.item.create",
  itemSchedule: "erp.planner.item.schedule",
  itemTransition: "erp.planner.item.transition",
  linkCreate: "erp.planner.link.create",
  recurrenceUpsert: "erp.planner.recurrence.upsert",
  relationCreate: "erp.planner.relation.create",
  reminderUpsert: "erp.planner.reminder.upsert",
  sessionStart: "erp.planner.session.start",
  sessionStop: "erp.planner.session.stop",
  signalCreate: "erp.planner.signal.create",
  signalPromote: "erp.planner.signal.promote",
  signalTransition: "erp.planner.signal.transition",
  viewDelete: "erp.planner.view.delete",
  viewUpsert: "erp.planner.view.upsert",
} as const satisfies Record<string, `${typeof PLANNER_AUDIT_PREFIX}.${string}`>

export type PlannerAuditActionId = keyof typeof PLANNER_AUDIT_ACTIONS

export type PlannerAuditActionString =
  (typeof PLANNER_AUDIT_ACTIONS)[PlannerAuditActionId]

export function buildPlannerAuditAction(
  object:
    | "signal"
    | "item"
    | "session"
    | "comment"
    | "attachment"
    | "assignment"
    | "link"
    | "relation"
    | "reminder"
    | "recurrence"
    | "view",
  verb:
    | "create"
    | "promote"
    | "transition"
    | "start"
    | "stop"
    | "comment"
    | "attach"
    | "assign"
    | "schedule"
    | "upsert"
    | "delete"
): `${typeof PLANNER_AUDIT_PREFIX}.${string}` {
  return `${PLANNER_AUDIT_PREFIX}.${object}.${verb}`
}
