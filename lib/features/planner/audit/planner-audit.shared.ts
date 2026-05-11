export const PLANNER_AUDIT_PREFIX = "erp.planner" as const

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
