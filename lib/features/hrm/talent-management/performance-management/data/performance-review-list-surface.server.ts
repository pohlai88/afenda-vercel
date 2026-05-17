import "server-only"

import type { ListSurfaceRendererConfiguration } from "#features/governed-surface"

import type { HrmPerformanceReviewListRow } from "./performance.queries.server"

type PerformanceReviewListCopy = {
  eyebrow: string
  title: string
  description: string
  empty: string
  colCycle: string
  colEmployee: string
  colReviewer: string
  colStage: string
  formatReviewer: (reviewerId: string) => string
}

export function buildPerformanceReviewListSurfaceConfiguration(
  rows: readonly HrmPerformanceReviewListRow[],
  copy: PerformanceReviewListCopy
): ListSurfaceRendererConfiguration {
  return {
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "performance",
      function: "read",
    },
    surface: {
      header: {
        eyebrow: copy.eyebrow,
        title: copy.title,
        description: copy.description,
      },
      columnsId: "hrm-performance-reviews",
      rowKey: "reviewId",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "cycle", header: copy.colCycle },
      { id: "employee", header: copy.colEmployee },
      { id: "reviewer", header: copy.colReviewer },
      {
        id: "stage",
        header: copy.colStage,
        cellKind: { kind: "badge", tone: "default" },
      },
    ],
    rows: rows.map((row) => ({
      id: row.reviewId,
      cells: {
        cycle: row.cycleName,
        employee: row.employeeLegalName,
        reviewer: copy.formatReviewer(row.reviewerId),
        stage: row.state,
      },
    })),
  }
}
