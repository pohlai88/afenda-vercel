import { assertGovernedSurfaceInput } from "#features/governed-surface"
import { listSurfaceRendererConfigurationSchema } from "#features/governed-surface/schemas/list-surface-renderer.schema"

export const GALLERY_PATTERN_C_READY = assertGovernedSurfaceInput(
  listSurfaceRendererConfigurationSchema,
  {
    dataNature: "table",
    presentation: { variant: "table-only", tableDensity: "compact" },
    surface: {
      header: { title: "Pattern C — ready" },
      columnsId: "gallery-pattern-c-ready",
      rowKey: "id",
      empty: { variant: "muted", title: "No rows in this fixture" },
    },
    columns: [
      { id: "employee", header: "Employee" },
      { id: "status", header: "Status", cellKind: { kind: "badge", tone: "default" } },
    ],
    rows: [
      {
        id: "row-1",
        cells: { employee: "Ada Lovelace", status: "In progress" },
        trailingAction: {
          state: "disabled",
          disabledReason:
            "Recording steps requires onboarding update permission.",
          descriptor: {
            id: "hrm.onboarding.record_step",
            label: "Record step",
            intent: "default",
          },
        },
      },
      {
        id: "row-2",
        cells: { employee: "Grace Hopper", status: "Complete" },
        trailingAction: { state: "ready" },
      },
    ],
  },
  "gallery-pattern-c-ready"
)

export const GALLERY_PATTERN_C_EMPTY = assertGovernedSurfaceInput(
  listSurfaceRendererConfigurationSchema,
  {
    dataNature: "table",
    presentation: { variant: "table-only", tableDensity: "compact" },
    surface: {
      header: { title: "Pattern C — empty" },
      columnsId: "gallery-pattern-c-empty",
      rowKey: "id",
      empty: { variant: "muted", title: "No rows in this fixture" },
    },
    columns: [{ id: "employee", header: "Employee" }],
    rows: [],
  },
  "gallery-pattern-c-empty"
)

/** Intentionally fails `parseListSurfaceRendererConfiguration` (columns min length). */
export const GALLERY_PATTERN_C_INVALID = {
  dataNature: "table" as const,
  presentation: { variant: "table-only" as const, tableDensity: "compact" as const },
  surface: {
    header: { title: "Pattern C — invalid" },
    columnsId: "gallery-pattern-c-invalid",
    rowKey: "id",
    empty: { variant: "muted" as const, title: "No rows" },
  },
  columns: [],
  rows: [],
}
