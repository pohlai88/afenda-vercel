import { assertGovernedSurfaceInput } from "#features/governed-surface/schemas/dev-assert.shared"
import { listSurfaceRendererConfigurationSchema } from "#features/governed-surface/schemas/list-surface-renderer.schema"

export const SHELL_PREVIEW_LIST_SURFACE = assertGovernedSurfaceInput(
  listSurfaceRendererConfigurationSchema,
  {
    dataNature: "table",
    surface: {
      header: {
        eyebrow: "HRM",
        title: "Employees",
        description: "Metadata-driven list surface preview (dev shell).",
      },
      columnsId: "dev-shell-preview-employees",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: "No employees",
        description: "Add employees to see rows in this preview table.",
      },
    },
    columns: [
      { id: "name", header: "Name", align: "start" },
      { id: "role", header: "Role", align: "start" },
      { id: "dept", header: "Department", align: "start" },
      { id: "status", header: "Status", align: "start" },
    ],
    rows: [
      {
        id: "1",
        cells: {
          name: "Alice Nguyen",
          role: "Software Engineer",
          dept: "Engineering",
          status: "Active",
        },
      },
      {
        id: "2",
        cells: {
          name: "Bob Carter",
          role: "Product Manager",
          dept: "Product",
          status: "Active",
        },
      },
      {
        id: "3",
        cells: {
          name: "Carol Kim",
          role: "Designer",
          dept: "Design",
          status: "On leave",
        },
      },
    ],
  },
  "shell-preview-list-surface"
)
