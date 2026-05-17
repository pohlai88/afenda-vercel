import {
  assertGovernedSurfaceInput,
  statCardConfigurationSchema,
} from "#features/governed-surface"
import { governedActionBarConfigurationSchema } from "#features/governed-surface/schemas/action-bar.schema"
import { auditPanelSchema } from "#features/governed-surface/schemas/audit-panel.schema"
import { governedDetailTabsSchema } from "#features/governed-surface/schemas/detail-tabs.schema"
import { emptyStateSchema } from "#features/governed-surface/schemas/list-surface.schema"
import { listSurfaceRendererConfigurationSchema } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { governedSectionConfigurationSchema } from "#features/governed-surface/schemas/section.schema"
import { governedStackConfigurationSchema } from "#features/governed-surface/schemas/stack.schema"

import { SHELL_PREVIEW_LIST_SURFACE } from "../fixtures/list-surface.fixture"

export const GALLERY_STAT_CARD_KPI = assertGovernedSurfaceInput(
  statCardConfigurationSchema,
  {
    dataNature: "kpi",
    density: "comfortable",
    stats: [
      { label: "Open roles", value: "12", delta: "4 urgent", tone: "attention" },
      { label: "Active apps", value: "86", delta: "+6", tone: "positive" },
      { label: "Offers", value: "3", tone: "default" },
      { label: "Time to hire", value: "18d", tone: "default" },
    ],
  },
  "gallery-stat-card-kpi"
)

export const GALLERY_STAT_CARD_SNAPSHOT = assertGovernedSurfaceInput(
  statCardConfigurationSchema,
  {
    dataNature: "snapshot-summary",
    density: "compact",
    stats: [
      { label: "Gross pay", value: "$4,250.00", tone: "default" },
      { label: "Deductions", value: "$612.40", tone: "attention" },
      { label: "Net pay", value: "$3,637.60", tone: "positive" },
    ],
  },
  "gallery-stat-card-snapshot"
)

export const GALLERY_LIST_SURFACE_TABLE = assertGovernedSurfaceInput(
  listSurfaceRendererConfigurationSchema,
  {
    dataNature: "table",
    surface: SHELL_PREVIEW_LIST_SURFACE.surface,
    columns: [
      { id: "name", header: "Name", cellKind: { kind: "text" } },
      { id: "role", header: "Role", cellKind: { kind: "text" } },
      {
        id: "status",
        header: "Status",
        cellKind: { kind: "badge", tone: "positive" },
      },
      {
        id: "amount",
        header: "Amount",
        align: "end",
        cellKind: { kind: "currency", currency: "USD" },
      },
    ],
    rows: [
      {
        id: "1",
        cells: {
          name: "Alice Nguyen",
          role: "Engineer",
          status: "Active",
          amount: 4200,
        },
        linkColumnId: "name",
        rowHref: "/dev/metadata-renderer-gallery",
      },
    ],
  },
  "gallery-list-surface-table"
)

export const GALLERY_LIST_SURFACE_DOCUMENT_LINES = assertGovernedSurfaceInput(
  listSurfaceRendererConfigurationSchema,
  {
    dataNature: "document-lines",
    surface: {
      header: {
        eyebrow: "Payslip",
        title: "Earnings lines",
        description: "Document-internal lines (no row navigation).",
      },
      columnsId: "gallery-payslip-lines",
      rowKey: "id",
      empty: { variant: "muted", title: "No lines" },
    },
    columns: [
      { id: "code", header: "Code", cellKind: { kind: "text" } },
      {
        id: "amount",
        header: "Amount",
        align: "end",
        cellKind: { kind: "currency", currency: "USD" },
      },
    ],
    rows: [
      { id: "base", cells: { code: "BASE", amount: 4000 } },
      { id: "ot", cells: { code: "OT", amount: 250 } },
    ],
  },
  "gallery-list-surface-document-lines"
)

export const GALLERY_ACTION_BAR = assertGovernedSurfaceInput(
  governedActionBarConfigurationSchema,
  {
    dataNature: "actions",
    actions: [
      { id: "primary", label: "Submit", intent: "default" },
      { id: "reject", label: "Reject", intent: "destructive" },
    ],
    ariaLabel: "Gallery actions",
  },
  "gallery-action-bar"
)

export const GALLERY_EMPTY = assertGovernedSurfaceInput(
  emptyStateSchema,
  {
    variant: "muted",
    title: "No records yet",
    description: "Add data to see the governed empty state.",
  },
  "gallery-empty"
)

export const GALLERY_AUDIT_PANEL = assertGovernedSurfaceInput(
  auditPanelSchema,
  {
    dataNature: "audit-trail",
    headerTitle: "Audit trail",
    headerDescription: "Recent IAM events (fixture).",
    rows: [
      {
        id: "1",
        action: "erp.hrm.employee.record.update",
        occurredAt: "2026-05-17T08:00:00.000Z",
        actorLabel: "Jordan Lee",
        resourceLabel: "Employee #1042",
        narrative: "Updated job title.",
      },
    ],
  },
  "gallery-audit-panel"
)

export const GALLERY_DETAIL_TABS = assertGovernedSurfaceInput(
  governedDetailTabsSchema,
  {
    dataNature: "tabbed-detail",
    entityLabel: "Alice Nguyen",
    entityKind: "employee",
    entityId: "emp-1042",
    overview: {
      id: "overview",
      label: "Overview",
      rendererKey: "governed:stat-card",
      rendererProps: GALLERY_STAT_CARD_SNAPSHOT,
    },
    defaultTab: "overview",
  },
  "gallery-detail-tabs"
)

export const GALLERY_STACK = assertGovernedSurfaceInput(
  governedStackConfigurationSchema,
  {
    direction: "horizontal",
    children: [
      {
        type: "governed:stat-card",
        serverType: "governed:stat-card",
        configuration: GALLERY_STAT_CARD_SNAPSHOT,
      },
      {
        type: "governed:stat-card",
        serverType: "governed:stat-card",
        configuration: GALLERY_STAT_CARD_KPI,
      },
    ],
  },
  "gallery-stack"
)

export const GALLERY_SECTION = assertGovernedSurfaceInput(
  governedSectionConfigurationSchema,
  {
    header: {
      eyebrow: "Composition",
      title: "Nested governed children",
      description: "Section wraps stat-card + list-surface.",
    },
    children: [
      {
        type: "governed:stat-card",
        serverType: "governed:stat-card",
        configuration: GALLERY_STAT_CARD_KPI,
      },
      {
        type: "governed:list-surface",
        serverType: "governed:list-surface",
        configuration: GALLERY_LIST_SURFACE_TABLE,
      },
    ],
  },
  "gallery-section"
)
