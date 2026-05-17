import type { GovernedComponent } from "#features/governed-surface"

import {
  GALLERY_ACTION_BAR,
  GALLERY_APPROVAL_TIMELINE,
  GALLERY_AUDIT_PANEL,
  GALLERY_CHART_TIME_SERIES,
  GALLERY_DETAIL_TABS,
  GALLERY_EMPTY,
  GALLERY_LIST_SURFACE_DOCUMENT_LINES,
  GALLERY_LIST_SURFACE_TABLE,
  GALLERY_SECTION,
  GALLERY_STACK,
  GALLERY_STAT_CARD_KPI,
  GALLERY_STAT_CARD_SNAPSHOT,
} from "./gallery-fixtures"

export type GalleryScenario = {
  id: string
  title: string
  description: string
  minWidthPx?: number
  component: GovernedComponent
  diagnostics?: "user" | "operator"
}

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
]
