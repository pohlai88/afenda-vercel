import {
  GALLERY_ACTION_BAR,
  GALLERY_APPROVAL_TIMELINE,
  GALLERY_AUDIT_PANEL,
  GALLERY_CHART_TIME_SERIES,
  GALLERY_KANBAN_CLAIMS_FOOTER,
  GALLERY_KANBAN_RECRUITMENT,
  GALLERY_KANBAN_RECRUITMENT_DRAG,
  GALLERY_KANBAN_RECRUITMENT_FOOTER_ACTIONS,
  GALLERY_MULTI_STEP_ONBOARDING,
  GALLERY_SCORECARD_INTERVIEW,
  GALLERY_DETAIL_TABS,
  GALLERY_EMPTY,
  GALLERY_LIST_SURFACE_DOCUMENT_LINES,
  GALLERY_LIST_SURFACE_TABLE,
  GALLERY_SECTION,
  GALLERY_STACK,
  GALLERY_STAT_CARD_KPI,
  GALLERY_STAT_CARD_SNAPSHOT,
} from "./gallery-fixtures"

import type {
  GalleryPreviewMode,
  GalleryScenario,
} from "../schemas/gallery-scenario.types.shared"

export type { GalleryPreviewMode, GalleryScenario }

export const GALLERY_SCENARIOS: readonly GalleryScenario[] = [
  {
    id: "stat-card-kpi",
    title: "Stat card — KPI",
    description: "dataNature: kpi · comfortable density",
    minWidthPx: 280,
    component: {
      type: "governed:stat-card",
      serverType: "governed:stat-card",
      configuration: GALLERY_STAT_CARD_KPI,
    },
  },
  {
    id: "stat-card-snapshot",
    title: "Stat card — snapshot summary",
    description: "dataNature: snapshot-summary · compact (payslip-style)",
    minWidthPx: 280,
    component: {
      type: "governed:stat-card",
      serverType: "governed:stat-card",
      configuration: GALLERY_STAT_CARD_SNAPSHOT,
    },
  },
  {
    id: "list-surface-table",
    title: "List surface — table",
    description: "Entity list with badge + currency cell kinds",
    minWidthPx: 480,
    component: {
      type: "governed:list-surface",
      serverType: "governed:list-surface",
      configuration: GALLERY_LIST_SURFACE_TABLE,
    },
  },
  {
    id: "list-surface-document-lines",
    title: "List surface — document lines",
    description: "Payslip / journal lines (no row href)",
    minWidthPx: 480,
    component: {
      type: "governed:list-surface",
      serverType: "governed:list-surface",
      configuration: GALLERY_LIST_SURFACE_DOCUMENT_LINES,
    },
  },
  {
    id: "section-nested",
    title: "Section — nested children",
    description: "stat-card + list-surface inside governed:section",
    minWidthPx: 480,
    component: {
      type: "governed:section",
      serverType: "governed:section",
      configuration: GALLERY_SECTION,
    },
  },
  {
    id: "stack-horizontal",
    title: "Stack — horizontal",
    description: "Two stat-cards in governed:stack",
    minWidthPx: 480,
    component: {
      type: "governed:stack",
      serverType: "governed:stack",
      configuration: GALLERY_STACK,
    },
  },
  {
    id: "action-bar",
    title: "Action bar",
    description: "dataNature: actions",
    minWidthPx: 320,
    component: {
      type: "governed:action-bar",
      serverType: "governed:action-bar",
      configuration: GALLERY_ACTION_BAR,
    },
  },
  {
    id: "empty-muted",
    title: "Empty state",
    description: "variant: muted",
    component: {
      type: "governed:empty",
      serverType: "governed:empty",
      configuration: GALLERY_EMPTY,
    },
  },
  {
    id: "audit-panel",
    title: "Audit panel",
    description: "dataNature: audit-trail",
    minWidthPx: 360,
    component: {
      type: "governed:audit-panel",
      serverType: "governed:audit-panel",
      configuration: GALLERY_AUDIT_PANEL,
    },
  },
  {
    id: "detail-tabs",
    title: "Detail tabs",
    description: "dataNature: tabbed-detail",
    minWidthPx: 480,
    component: {
      type: "governed:detail-tabs",
      serverType: "governed:detail-tabs",
      configuration: GALLERY_DETAIL_TABS,
    },
  },
  {
    id: "chart-time-series",
    title: "Chart — time series",
    description: "dataNature: time-series · line chart",
    minWidthPx: 360,
    component: {
      type: "governed:chart",
      serverType: "governed:chart",
      configuration: GALLERY_CHART_TIME_SERIES,
    },
  },
  {
    id: "approval-timeline",
    title: "Approval timeline",
    description: "dataNature: approval-flow",
    minWidthPx: 320,
    component: {
      type: "governed:approval-timeline",
      serverType: "governed:approval-timeline",
      configuration: GALLERY_APPROVAL_TIMELINE,
    },
  },
  {
    id: "kanban-recruitment",
    title: "Kanban — recruitment pipeline (read-only)",
    description:
      "dataNature: kanban · read-only · transition hints via availableTransitions",
    minWidthPx: 720,
    component: {
      type: "governed:kanban-board",
      serverType: "governed:kanban-board",
      configuration: GALLERY_KANBAN_RECRUITMENT,
    },
  },
  {
    id: "kanban-recruitment-drag",
    title: "Kanban — recruitment pipeline (drag reorder)",
    description:
      "dataNature: kanban · drag-reorder · GovernedKanbanDragBoard bridge",
    minWidthPx: 720,
    previewMode: "kanban-drag-reorder",
    component: {
      type: "governed:kanban-board",
      serverType: "governed:kanban-board",
      configuration: GALLERY_KANBAN_RECRUITMENT_DRAG,
    },
  },
  {
    id: "kanban-recruitment-footer",
    title: "Kanban — recruitment pipeline (footer actions)",
    description:
      "dataNature: kanban · footer-actions · GovernedKanbanFooterBoard bridge",
    minWidthPx: 720,
    previewMode: "kanban-footer-actions",
    component: {
      type: "governed:kanban-board",
      serverType: "governed:kanban-board",
      configuration: GALLERY_KANBAN_RECRUITMENT_FOOTER_ACTIONS,
    },
  },
  {
    id: "kanban-claims-footer",
    title: "Kanban — claims lifecycle (footer actions)",
    description:
      "dataNature: kanban · footer-actions · hrm:claims:kanban · ClaimKanbanCardFooter bridge",
    minWidthPx: 720,
    previewMode: "kanban-footer-actions",
    component: {
      type: "governed:kanban-board",
      serverType: "governed:kanban-board",
      configuration: GALLERY_KANBAN_CLAIMS_FOOTER,
    },
  },
  {
    id: "multi-step-onboarding",
    title: "Multi-step form — onboarding",
    description: "dataNature: wizard",
    minWidthPx: 480,
    component: {
      type: "governed:multi-step-form",
      serverType: "governed:multi-step-form",
      configuration: GALLERY_MULTI_STEP_ONBOARDING,
    },
  },
  {
    id: "scorecard-interview",
    title: "Scorecard — interview feedback",
    description: "dataNature: scoring",
    minWidthPx: 360,
    component: {
      type: "governed:scorecard-form",
      serverType: "governed:scorecard-form",
      configuration: GALLERY_SCORECARD_INTERVIEW,
    },
  },
]
