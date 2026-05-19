export type PlannerActivityDisplay = {
  label: string
  tone: "info" | "warning" | "critical" | "outline"
}

export function describePlannerActivityDisplay(
  activityType: string
): PlannerActivityDisplay {
  switch (activityType) {
    case "item_created":
    case "signal_created":
    case "signal_promoted":
    case "item_promoted_from_signal":
      return { label: "Created", tone: "info" }
    case "item_lifecycle_transition":
    case "signal_lifecycle_transition":
    case "signal_resolution_applied":
      return { label: "Lifecycle", tone: "warning" }
    case "schedule_updated":
    case "reminder_created":
    case "reminder_updated":
    case "recurrence_created":
    case "recurrence_updated":
    case "recurrence_processed":
    case "reminder_delivered":
      return { label: "Schedule", tone: "info" }
    case "assignment_updated":
      return { label: "Ownership", tone: "warning" }
    case "erp_link_created":
      return { label: "ERP Link", tone: "outline" }
    case "relation_created":
    case "signal_correlated":
      return { label: "Relation", tone: "outline" }
    case "session_started":
    case "session_stopped":
      return { label: "Session", tone: "info" }
    case "comment_added":
      return { label: "Comment", tone: "outline" }
    case "attachment_added":
      return { label: "Evidence", tone: "outline" }
    case "notice_read":
    case "notice_acknowledged":
    case "notice_closed":
      return { label: "Notice", tone: "warning" }
    case "automation_failure_observed":
      return { label: "Automation", tone: "warning" }
    default:
      return { label: "Activity", tone: "outline" }
  }
}
