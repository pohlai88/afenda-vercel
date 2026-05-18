import "server-only"

import {
  listSurfaceRowTrailingActionHidden,
  resolveListSurfaceRowTrailingAction,
  type ListSurfaceRendererConfigurationInput,
} from "#features/governed-surface"

import { performanceReviewRowHasTrailingUi } from "./performance-review.shared"
import type { HrmPerformanceReviewListRow } from "./performance.queries.server"

const PRESENTATION = {
  variant: "table-only" as const,
  tableDensity: "compact" as const,
}

type PerformanceReviewListCopy = {
  eyebrow: string
  title: string
  description: string
  empty: string
  colCycle: string
  colEmployee: string
  colReviewer: string
  colStage: string
  unassignedReviewer: string
}

type PerformanceReviewListContext = {
  canUpdate: boolean
  viewerUserId: string
}

function formatReviewerDisplay(
  row: HrmPerformanceReviewListRow,
  unassignedReviewer: string
): string {
  if (row.reviewerLegalName?.trim()) {
    const number = row.reviewerEmployeeNumber?.trim()
    return number ? `${row.reviewerLegalName} (${number})` : row.reviewerLegalName
  }
  if (row.reviewerId.trim()) {
    return `${row.reviewerId.slice(0, 8)}…`
  }
  return unassignedReviewer
}

export function buildPerformanceReviewListSurfaceConfiguration(
  rows: readonly HrmPerformanceReviewListRow[],
  copy: PerformanceReviewListCopy,
  context: PerformanceReviewListContext
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    requiresErpPermission: {
      module: "hrm",
      object: "performance",
      function: "read",
    },
    presentation: PRESENTATION,
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
        reviewer: formatReviewerDisplay(row, copy.unassignedReviewer),
        stage: row.state,
      },
      trailingAction: performanceReviewRowHasTrailingUi(row, context)
        ? resolveListSurfaceRowTrailingAction({
            visible: true,
            allowed: true,
            descriptor: {
              id: "erp.hrm.performance.review.actions",
              label: "Review actions",
              intent: "default",
            },
          })
        : listSurfaceRowTrailingActionHidden(),
    })),
  }
}
