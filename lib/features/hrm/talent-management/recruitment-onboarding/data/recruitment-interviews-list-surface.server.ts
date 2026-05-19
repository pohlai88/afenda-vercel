import "server-only"

import type { ListSurfaceRendererConfigurationInput } from "#features/governed-surface"

import type { InterviewQueueRow } from "./recruitment.queries.server"
import {
  RECRUITMENT_READ_PERMISSION,
  RECRUITMENT_TABLE_PRESENTATION,
} from "./recruitment-list-surface.shared"

type RecruitmentInterviewsListCopy = {
  empty: string
  colCandidate: string
  colRole: string
  colScheduled: string
  colOutcome: string
  formatScheduled: (value: Date) => string
  outcomePending: string
}

export function buildRecruitmentInterviewsListSurfaceConfiguration(
  rows: readonly InterviewQueueRow[],
  copy: RecruitmentInterviewsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    presentation: RECRUITMENT_TABLE_PRESENTATION,
    surface: {
      header: { title: "hrm-recruitment-interviews" },
      columnsId: "hrm-recruitment-interviews",
      rowKey: "id",
      empty: { variant: "muted", title: copy.empty },
    },
    columns: [
      { id: "candidate", header: copy.colCandidate },
      { id: "role", header: copy.colRole },
      { id: "scheduled", header: copy.colScheduled },
      {
        id: "outcome",
        header: copy.colOutcome,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      cells: {
        candidate: row.candidateName,
        role: row.requisitionTitle,
        scheduled: copy.formatScheduled(row.scheduledAt),
        outcome: row.outcome ?? copy.outcomePending,
      },
      trailingAction: row.outcome
        ? { state: "hidden" }
        : {
            state: "ready",
            descriptor: { id: "submit-feedback", label: "Feedback" },
          },
    })),
  }
}
