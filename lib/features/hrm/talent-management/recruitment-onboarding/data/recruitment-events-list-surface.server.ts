import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { RecruitmentEventRow } from "./recruitment.queries.server"
import {
  RECRUITMENT_READ_PERMISSION,
  RECRUITMENT_TABLE_PRESENTATION,
} from "./recruitment-list-surface.shared"

type RecruitmentEventsListCopy = {
  empty: string
  colEvent: string
  colWhen: string
  formatEvent: (row: RecruitmentEventRow) => string
  formatWhen: (value: Date) => string
}

export function buildRecruitmentEventsListSurfaceConfiguration(
  rows: readonly RecruitmentEventRow[],
  copy: RecruitmentEventsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    presentation: RECRUITMENT_TABLE_PRESENTATION,
    surface: {
      header: { title: "hrm-recruitment-events" },
      columnsId: "hrm-recruitment-events",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "event", header: copy.colEvent },
      { id: "when", header: copy.colWhen, align: "end" },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        event: copy.formatEvent(row),
        when: copy.formatWhen(row.createdAt),
      },
    })),
  }
}
