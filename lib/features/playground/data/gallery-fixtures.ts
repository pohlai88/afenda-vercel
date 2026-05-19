import {
  assertGovernedSurfaceInput,
  buildKanbanOutgoingTransitionHints,
  buildKanbanWorkflowFromColumnTransitions,
  resolveKanbanCardTransition,
  statCardConfigurationSchema,
} from "#features/governed-surface"
import { governedActionBarConfigurationSchema } from "#features/governed-surface/schemas/action-bar.schema"
import { auditPanelSchema } from "#features/governed-surface/schemas/audit-panel.schema"
import { governedDetailTabsSchema } from "#features/governed-surface/schemas/detail-tabs.schema"
import { emptyStateSchema } from "#features/governed-surface/schemas/list-surface.schema"
import { listSurfaceRendererConfigurationSchema } from "#features/governed-surface/schemas/list-surface-renderer.schema"
import { governedSectionConfigurationSchema } from "#features/governed-surface/schemas/section.schema"
import { governedApprovalTimelineConfigurationSchema } from "#features/governed-surface/schemas/approval-timeline.schema"
import { governedChartConfigurationSchema } from "#features/governed-surface/schemas/chart.schema"
import { governedKanbanBoardConfigurationSchema } from "#features/governed-surface/schemas/kanban-board.schema"
import { governedMultiStepFormConfigurationSchema } from "#features/governed-surface/schemas/multi-step-form.schema"
import { governedScorecardFormConfigurationSchema } from "#features/governed-surface/schemas/scorecard-form.schema"
import { governedStackConfigurationSchema } from "#features/governed-surface/schemas/stack.schema"

import { SHELL_PREVIEW_LIST_SURFACE } from "./shell-preview-fixtures/list-surface.fixture"

export const GALLERY_STAT_CARD_KPI = assertGovernedSurfaceInput(
  statCardConfigurationSchema,
  {
    dataNature: "kpi",
    density: "comfortable",
    stats: [
      {
        label: "Open roles",
        value: "12",
        delta: "4 urgent",
        tone: "attention",
      },
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
        rowHref: "/playground/metadata-renderer-gallery",
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

export const GALLERY_CHART_TIME_SERIES = assertGovernedSurfaceInput(
  governedChartConfigurationSchema,
  {
    dataNature: "time-series",
    chartKind: "line",
    title: "Leave utilization",
    series: [
      {
        id: "approved",
        label: "Approved",
        points: [
          { x: "W1", y: 4 },
          { x: "W2", y: 6 },
          { x: "W3", y: 5 },
        ],
      },
    ],
  },
  "gallery-chart-time-series"
)

const GALLERY_KANBAN_WORKFLOW = buildKanbanWorkflowFromColumnTransitions({
  applied: ["screening"],
  screening: ["interview"],
  interview: ["offer"],
})

export const GALLERY_KANBAN_RECRUITMENT = assertGovernedSurfaceInput(
  governedKanbanBoardConfigurationSchema,
  {
    dataNature: "kanban",
    interactionMode: "read-only",
    copy: {
      boardAriaLabel: "Recruitment pipeline",
      emptyColumn: "No candidates in this stage",
    },
    workflow: GALLERY_KANBAN_WORKFLOW,
    columns: [
      { id: "applied", label: "Applied", badgeTone: "default" },
      { id: "screening", label: "Screening", badgeTone: "attention" },
      { id: "interview", label: "Interview", badgeTone: "attention" },
      { id: "offer", label: "Offer", badgeTone: "positive" },
    ],
    columnOrder: ["applied", "screening", "interview", "offer"],
    cards: [
      {
        id: "app-1",
        columnId: "applied",
        title: "Jordan Lee",
        subtitle: "Product designer",
        badges: ["New"],
        availableTransitions: buildKanbanOutgoingTransitionHints("applied", [
          {
            toColumnId: "screening",
            label: "Move to screening",
            allowed: false,
            disabledReason: "Requires recruiter assignment",
          },
        ]),
      },
      {
        id: "app-2",
        columnId: "screening",
        title: "Sam Rivera",
        subtitle: "Engineer",
        badges: ["2 interviews"],
        availableTransitions: [
          resolveKanbanCardTransition({
            fromColumnId: "screening",
            toColumnId: "interview",
            label: "Move to interview",
            allowed: true,
          }),
        ],
      },
      {
        id: "app-3",
        columnId: "offer",
        title: "Alex Kim",
        subtitle: "Ops lead",
        badges: ["Offer sent"],
      },
    ],
  },
  "gallery-kanban-recruitment"
)

export const GALLERY_KANBAN_RECRUITMENT_FOOTER_ACTIONS =
  assertGovernedSurfaceInput(
    governedKanbanBoardConfigurationSchema,
    {
      dataNature: "kanban",
      interactionMode: "footer-actions",
      copy: {
        boardAriaLabel: "Recruitment pipeline",
        emptyColumn: "No candidates in this stage",
      },
      workflow: GALLERY_KANBAN_WORKFLOW,
      columns: [
        { id: "applied", label: "Applied", badgeTone: "default" },
        { id: "screening", label: "Screening", badgeTone: "attention" },
        { id: "interview", label: "Interview", badgeTone: "attention" },
        { id: "offer", label: "Offer", badgeTone: "positive" },
      ],
      columnOrder: ["applied", "screening", "interview", "offer"],
      cards: [
        {
          id: "app-1",
          columnId: "applied",
          title: "Jordan Lee",
          subtitle: "Product designer",
          badges: ["New"],
        },
        {
          id: "app-2",
          columnId: "screening",
          title: "Sam Rivera",
          subtitle: "Engineer",
          badges: ["2 interviews"],
        },
        {
          id: "app-3",
          columnId: "offer",
          title: "Alex Kim",
          subtitle: "Ops lead",
          badges: ["Offer sent"],
        },
      ],
    },
    "gallery-kanban-recruitment-footer"
  )

export const GALLERY_KANBAN_RECRUITMENT_DRAG = assertGovernedSurfaceInput(
  governedKanbanBoardConfigurationSchema,
  {
    dataNature: "kanban",
    interactionMode: "drag-reorder",
    copy: {
      boardAriaLabel: "Recruitment pipeline (drag)",
      emptyColumn: "No candidates in this stage",
      dragHandleAriaLabel: "Move candidate card",
    },
    workflow: GALLERY_KANBAN_WORKFLOW,
    columns: [
      { id: "applied", label: "Applied", badgeTone: "default" },
      { id: "screening", label: "Screening", badgeTone: "attention" },
      { id: "interview", label: "Interview", badgeTone: "attention" },
      { id: "offer", label: "Offer", badgeTone: "positive" },
    ],
    columnOrder: ["applied", "screening", "interview", "offer"],
    cards: [
      {
        id: "app-1",
        columnId: "applied",
        title: "Jordan Lee",
        subtitle: "Product designer",
        badges: ["New"],
        availableTransitions: buildKanbanOutgoingTransitionHints("applied", [
          {
            toColumnId: "screening",
            label: "Move to screening",
            allowed: true,
          },
        ]),
      },
      {
        id: "app-2",
        columnId: "screening",
        title: "Sam Rivera",
        subtitle: "Engineer",
        badges: ["2 interviews"],
        availableTransitions: [
          resolveKanbanCardTransition({
            fromColumnId: "screening",
            toColumnId: "interview",
            label: "Move to interview",
            allowed: true,
          }),
        ],
      },
      {
        id: "app-3",
        columnId: "offer",
        title: "Alex Kim",
        subtitle: "Ops lead",
        badges: ["Offer sent"],
        availableTransitions: [],
      },
    ],
  },
  "gallery-kanban-recruitment-drag"
)

const GALLERY_KANBAN_CLAIMS_WORKFLOW = buildKanbanWorkflowFromColumnTransitions(
  {
    submitted: ["approved", "rejected", "returned", "cancelled"],
    returned: ["submitted", "cancelled"],
    approved: ["paid", "cancelled"],
    rejected: [],
    paid: [],
    cancelled: [],
  }
)

export const GALLERY_KANBAN_CLAIMS_FOOTER = assertGovernedSurfaceInput(
  governedKanbanBoardConfigurationSchema,
  {
    dataNature: "kanban",
    interactionMode: "footer-actions",
    copy: {
      boardAriaLabel: "Claims lifecycle",
      emptyColumn: "No claims in this column",
    },
    workflow: GALLERY_KANBAN_CLAIMS_WORKFLOW,
    columns: [
      { id: "submitted", label: "Submitted", badgeTone: "attention" },
      { id: "returned", label: "Returned", badgeTone: "attention" },
      { id: "approved", label: "Approved (unpaid)", badgeTone: "positive" },
      { id: "rejected", label: "Rejected", badgeTone: "critical" },
      { id: "paid", label: "Paid", badgeTone: "positive" },
      { id: "cancelled", label: "Cancelled", badgeTone: "critical" },
    ],
    columnOrder: [
      "submitted",
      "returned",
      "approved",
      "rejected",
      "paid",
      "cancelled",
    ],
    cards: [
      {
        id: "claim-1",
        columnId: "submitted",
        title: "Aminah Rahman",
        subtitle: "TRAVEL · 420.00 MYR",
        badges: ["2 files", "Under review"],
      },
      {
        id: "claim-2",
        columnId: "approved",
        title: "Lee Wei",
        subtitle: "MEDICAL · 180.00 MYR",
        badges: ["1 file"],
      },
      {
        id: "claim-3",
        columnId: "paid",
        title: "Jordan Tan",
        subtitle: "MEAL · 45.50 MYR",
      },
    ],
  },
  "gallery-kanban-claims-footer"
)

export const GALLERY_MULTI_STEP_ONBOARDING = assertGovernedSurfaceInput(
  governedMultiStepFormConfigurationSchema,
  {
    dataNature: "wizard",
    formId: "gallery-onboarding",
    actionId: "hrm.onboarding.submit",
    submitLabel: "Submit onboarding",
    steps: [
      {
        id: "profile",
        title: "Profile",
        fields: [
          {
            id: "legalName",
            label: "Legal name",
            kind: "text",
            required: true,
          },
          {
            id: "workEmail",
            label: "Work email",
            kind: "email",
            required: true,
          },
        ],
      },
      {
        id: "equipment",
        title: "Equipment",
        fields: [
          {
            id: "laptop",
            label: "Laptop preference",
            kind: "select",
            required: true,
            options: [
              { value: "mac", label: "MacBook" },
              { value: "win", label: "Windows" },
            ],
          },
          {
            id: "assetTag",
            label: "Asset tag (Mac only)",
            kind: "text",
            rules: [
              {
                effect: "SHOW",
                condition: {
                  scope: "field",
                  fieldId: "laptop",
                  equals: "mac",
                },
              },
            ],
          },
        ],
      },
    ],
  },
  "gallery-multi-step-onboarding"
)

export const GALLERY_SCORECARD_INTERVIEW = assertGovernedSurfaceInput(
  governedScorecardFormConfigurationSchema,
  {
    dataNature: "scoring",
    formId: "gallery-interview-scorecard",
    actionId: "hrm.interview.score",
    title: "Interview scorecard",
    criteria: [
      {
        id: "communication",
        label: "Communication",
        description: "Clarity and structure in answers",
        maxScore: 5,
      },
      {
        id: "role-fit",
        label: "Role fit",
        maxScore: 5,
      },
    ],
    notesFieldId: "notes",
    submitLabel: "Save scorecard",
  },
  "gallery-scorecard-interview"
)

export const GALLERY_APPROVAL_TIMELINE = assertGovernedSurfaceInput(
  governedApprovalTimelineConfigurationSchema,
  {
    dataNature: "approval-flow",
    title: "Expense approval",
    steps: [
      {
        id: "submit",
        label: "Submitted",
        status: "complete",
        actorLabel: "Employee",
      },
      {
        id: "manager",
        label: "Manager review",
        status: "active",
        actorLabel: "Manager",
      },
      {
        id: "finance",
        label: "Finance",
        status: "pending",
      },
    ],
  },
  "gallery-approval-timeline"
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
