import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { RecruitmentOperationalReportRow } from "./recruitment.queries.server"
import {
  RECRUITMENT_READ_PERMISSION,
  RECRUITMENT_TABLE_PRESENTATION,
} from "./recruitment-list-surface.shared"

type RecruitmentReportListCopy = {
  empty: string
  colArea: string
  colCount: string
  colStatus: string
  areaLabel: (row: RecruitmentOperationalReportRow) => string
  statusLabel: (row: RecruitmentOperationalReportRow) => string
}

export function buildRecruitmentReportListSurfaceConfiguration(
  rows: readonly RecruitmentOperationalReportRow[],
  copy: RecruitmentReportListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    presentation: RECRUITMENT_TABLE_PRESENTATION,
    surface: {
      header: { title: "hrm-recruitment-operational-report" },
      columnsId: "hrm-recruitment-operational-report",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "area", header: copy.colArea },
      { id: "count", header: copy.colCount, align: "end" },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        area: copy.areaLabel(row),
        count: row.count,
        status: copy.statusLabel(row),
      },
    })),
  }
}
