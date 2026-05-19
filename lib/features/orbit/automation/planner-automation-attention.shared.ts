import type { SQL } from "drizzle-orm"
import { ilike, or } from "drizzle-orm"

import { orgNotificationNotice } from "#lib/db/schema"

export const PLANNER_AUTOMATION_ATTENTION_KINDS = [
  "reminder_delivery",
  "recurrence_processing",
] as const

export type PlannerAutomationAttentionKind =
  (typeof PLANNER_AUTOMATION_ATTENTION_KINDS)[number]

const PLANNER_AUTOMATION_ATTENTION_TITLE_PREFIX_BY_KIND = {
  reminder_delivery: "Orbit reminder delivery failed:",
  recurrence_processing: "Orbit recurrence processing failed:",
} as const satisfies Record<PlannerAutomationAttentionKind, string>

export function plannerAutomationAttentionTitlePrefix(
  kind: PlannerAutomationAttentionKind
): string {
  return PLANNER_AUTOMATION_ATTENTION_TITLE_PREFIX_BY_KIND[kind]
}

export function describePlannerAutomationAttentionKind(
  kind: PlannerAutomationAttentionKind
): string {
  switch (kind) {
    case "reminder_delivery":
      return "Reminder delivery"
    case "recurrence_processing":
      return "Recurrence processing"
  }
}

export function parsePlannerAutomationAttentionKindFromNoticeTitle(
  title: string | null | undefined
): PlannerAutomationAttentionKind | null {
  if (!title) return null

  for (const kind of PLANNER_AUTOMATION_ATTENTION_KINDS) {
    if (title.startsWith(plannerAutomationAttentionTitlePrefix(kind))) {
      return kind
    }
  }

  return null
}

export function plannerAutomationAttentionNoticeTitleWhere(
  kind?: PlannerAutomationAttentionKind
): SQL<unknown> | undefined {
  if (kind) {
    return ilike(
      orgNotificationNotice.title,
      `${plannerAutomationAttentionTitlePrefix(kind)}%`
    )
  }

  return or(
    ...PLANNER_AUTOMATION_ATTENTION_KINDS.map((entry) =>
      ilike(
        orgNotificationNotice.title,
        `${plannerAutomationAttentionTitlePrefix(entry)}%`
      )
    )
  )
}
