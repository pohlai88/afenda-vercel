import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { JobOfferRow } from "./recruitment.queries.server"
import {
  RECRUITMENT_READ_PERMISSION,
  RECRUITMENT_TABLE_PRESENTATION,
} from "./recruitment-list-surface.shared"

type RecruitmentOffersListCopy = {
  empty: string
  colCandidate: string
  colRole: string
  colCompensation: string
  colStatus: string
  formatCompensation: (row: JobOfferRow) => string
  statusLabel: (status: JobOfferRow["status"]) => string
}

export function buildRecruitmentOffersListSurfaceConfiguration(
  rows: readonly JobOfferRow[],
  copy: RecruitmentOffersListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    presentation: RECRUITMENT_TABLE_PRESENTATION,
    surface: {
      header: { title: "hrm-recruitment-offers" },
      columnsId: "hrm-recruitment-offers",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "candidate", header: copy.colCandidate },
      { id: "role", header: copy.colRole },
      { id: "compensation", header: copy.colCompensation },
      {
        id: "status",
        header: copy.colStatus,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        candidate: row.candidateName,
        role: row.requisitionTitle,
        compensation: copy.formatCompensation(row),
        status: copy.statusLabel(row.status),
      },
      trailingAction: { state: "ready", descriptor: { id: "offer-actions", label: "Actions" } },
    })),
  }
}
