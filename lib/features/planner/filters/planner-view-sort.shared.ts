import type {
  PlannerItemRow,
  PlannerSignalRow,
  PlannerViewSortMode,
} from "../types"

function nullTime(value: Date | null | undefined): number {
  return value ? value.getTime() : Number.MAX_SAFE_INTEGER
}

function comparePriorityDesc(a: { pressureScore: number }, b: { pressureScore: number }) {
  return b.pressureScore - a.pressureScore
}

function compareCreatedDesc(a: { createdAt: Date }, b: { createdAt: Date }) {
  return b.createdAt.getTime() - a.createdAt.getTime()
}

function compareUpdatedDesc(a: { updatedAt: Date }, b: { updatedAt: Date }) {
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

function compareTitleAsc(a: { title: string }, b: { title: string }) {
  return a.title.localeCompare(b.title)
}

export function sortPlannerItems(
  rows: readonly PlannerItemRow[],
  sortMode: PlannerViewSortMode | null | undefined
): PlannerItemRow[] {
  const next = [...rows]

  switch (sortMode) {
    case "due_asc":
      return next.sort(
        (a, b) =>
          nullTime(a.dueAt ?? a.scheduleStartAt) -
            nullTime(b.dueAt ?? b.scheduleStartAt) ||
          comparePriorityDesc(a, b) ||
          compareCreatedDesc(a, b)
      )
    case "created_desc":
      return next.sort(compareCreatedDesc)
    case "updated_desc":
      return next.sort(compareUpdatedDesc)
    case "title_asc":
      return next.sort(compareTitleAsc)
    case "priority_desc":
    default:
      return next.sort(
        (a, b) =>
          comparePriorityDesc(a, b) ||
          nullTime(a.dueAt ?? a.scheduleStartAt) -
            nullTime(b.dueAt ?? b.scheduleStartAt) ||
          compareCreatedDesc(a, b)
      )
  }
}

export function sortPlannerSignals(
  rows: readonly PlannerSignalRow[],
  sortMode: PlannerViewSortMode | null | undefined
): PlannerSignalRow[] {
  const next = [...rows]

  switch (sortMode) {
    case "created_desc":
      return next.sort(compareCreatedDesc)
    case "updated_desc":
      return next.sort(compareUpdatedDesc)
    case "title_asc":
      return next.sort(compareTitleAsc)
    case "due_asc":
      return next.sort(
        (a, b) =>
          nullTime(a.expiresAt) - nullTime(b.expiresAt) ||
          comparePriorityDesc(a, b) ||
          compareCreatedDesc(a, b)
      )
    case "priority_desc":
    default:
      return next.sort(
        (a, b) =>
          comparePriorityDesc(a, b) ||
          nullTime(a.expiresAt) - nullTime(b.expiresAt) ||
          compareCreatedDesc(a, b)
      )
  }
}
