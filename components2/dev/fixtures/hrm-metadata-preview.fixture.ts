import type {
  ListSurfaceRendererConfigurationInput,
  StatCardConfigurationInput,
} from "#features/governed-surface"

import {
  HRM_METADATA_PREVIEW_HREF,
  HRM_METADATA_PREVIEW_PORTAL_SLUG,
} from "./preview-href.shared"

export {
  DEV_PAYSLIP_LIST_SURFACE as HRM_PREVIEW_EMPLOYEE_PAYSLIPS_LIST,
  DEV_PAYSLIP_LINES_SURFACE as HRM_PREVIEW_EMPLOYEE_PAYSLIP_LINES_LIST,
  DEV_PAYSLIP_SUMMARY_STATS as HRM_PREVIEW_EMPLOYEE_PAYSLIP_SUMMARY_STATS,
} from "../hrm-metadata-preview/payslip-metadata.shared"

const MOCK_PORTAL = HRM_METADATA_PREVIEW_PORTAL_SLUG

/** Workbench recruitment — pipeline KPI strip. */
export const HRM_PREVIEW_RECRUITMENT_PIPELINE_STATS = {
  stats: [
    {
      label: "Open requisitions",
      value: "4",
      delta: "Published roles",
      tone: "default",
    },
    {
      label: "Pipeline",
      value: "18",
      delta: "In pipeline",
      tone: "attention",
    },
    {
      label: "Interviews due",
      value: "6",
      delta: "Scheduled or pending",
      tone: "default",
    },
    {
      label: "Offers pending",
      value: "3",
      delta: "Draft through sent",
      tone: "positive",
    },
  ],
} as const satisfies StatCardConfigurationInput

export const HRM_PREVIEW_RECRUITMENT_REQUISITIONS_LIST = {
  surface: {
    header: {
      eyebrow: "Requisitions",
      title: "Requisitions",
      description: "Create a draft headcount request.",
    },
    columnsId: "hrm-preview-requisitions",
    rowKey: "id",
    empty: { variant: "muted", title: "No requisitions yet." },
  },
  columns: [
    { id: "title", header: "Title" },
    { id: "department", header: "Department" },
    { id: "headcount", header: "Headcount", align: "end" },
    { id: "status", header: "Status", align: "center" },
  ],
  rows: [
    {
      id: "req-senior-fe",
      linkColumnId: "title",
      rowHref: HRM_METADATA_PREVIEW_HREF,
      cells: {
        title: "Senior Frontend Engineer",
        department: "Product Engineering",
        headcount: 2,
        status: "open",
      },
    },
    {
      id: "req-pm",
      linkColumnId: "title",
      rowHref: HRM_METADATA_PREVIEW_HREF,
      cells: {
        title: "Product Manager — Growth",
        department: "Product",
        headcount: 1,
        status: "open",
      },
    },
    {
      id: "req-support",
      linkColumnId: "title",
      rowHref: HRM_METADATA_PREVIEW_HREF,
      cells: {
        title: "Customer Support Lead",
        department: "Operations",
        headcount: 1,
        status: "draft",
      },
    },
  ],
} as const satisfies ListSurfaceRendererConfigurationInput

export const HRM_PREVIEW_RECRUITMENT_APPLICATIONS_LIST = {
  surface: {
    header: {
      eyebrow: "Pipeline",
      title: "Pipeline",
      description: "Link a candidate to a requisition.",
    },
    columnsId: "hrm-preview-applications",
    rowKey: "id",
    empty: { variant: "muted", title: "No applications in this stage." },
  },
  columns: [
    { id: "candidate", header: "Candidate" },
    { id: "role", header: "Requisition" },
    { id: "stage", header: "Stage" },
  ],
  rows: [
    {
      id: "app-1",
      linkColumnId: "candidate",
      rowHref: HRM_METADATA_PREVIEW_HREF,
      cells: {
        candidate: "Jordan Lee",
        role: "Senior Frontend Engineer",
        stage: "interview",
      },
    },
    {
      id: "app-2",
      linkColumnId: "candidate",
      rowHref: HRM_METADATA_PREVIEW_HREF,
      cells: {
        candidate: "Samira Okonkwo",
        role: "Product Manager — Growth",
        stage: "shortlisted",
      },
    },
    {
      id: "app-3",
      linkColumnId: "candidate",
      rowHref: HRM_METADATA_PREVIEW_HREF,
      cells: {
        candidate: "Alex Chen",
        role: "Senior Frontend Engineer",
        stage: "applied",
      },
    },
  ],
} as const satisfies ListSurfaceRendererConfigurationInput

/** Candidate portal — public careers listing. */
export const HRM_PREVIEW_CANDIDATE_CAREERS_LIST = {
  surface: {
    header: {
      eyebrow: "Open roles",
      title: "Open roles",
      description:
        "Browse published openings and apply with a structured profile. No account required to view listings.",
    },
    columnsId: "cssp-preview-careers",
    rowKey: "id",
    empty: { variant: "muted", title: "No open roles right now" },
  },
  columns: [
    { id: "title", header: "Role" },
    { id: "department", header: "Department" },
    { id: "headcount", header: "Headcount", align: "end" },
    { id: "status", header: "Status", align: "center" },
  ],
  rows: [
    {
      id: "req-senior-fe",
      linkColumnId: "title",
      rowHref: `/p/${MOCK_PORTAL}/candidate/careers/req-senior-fe`,
      cells: {
        title: "Senior Frontend Engineer",
        department: "Product Engineering",
        headcount: 2,
        status: "Open",
      },
    },
    {
      id: "req-pm",
      linkColumnId: "title",
      rowHref: `/p/${MOCK_PORTAL}/candidate/careers/req-pm`,
      cells: {
        title: "Product Manager — Growth",
        department: "Product",
        headcount: 1,
        status: "Open",
      },
    },
  ],
} as const satisfies ListSurfaceRendererConfigurationInput

/** Candidate portal — role detail (stat-card tiles). */
export const HRM_PREVIEW_CANDIDATE_ROLE_DETAIL_STATS = {
  stats: [
    {
      label: "Product Engineering",
      value: "Senior Frontend Engineer",
      delta: "Headcount: 2",
      tone: "default",
    },
    {
      label: "Skills",
      value: "typescript, react, design-systems",
      delta: "Self-declare on apply",
      tone: "attention",
    },
  ],
} as const satisfies StatCardConfigurationInput

/** Candidate portal — magic-link application status. */
export const HRM_PREVIEW_CANDIDATE_APPLICATION_STATUS_STATS = {
  stats: [
    {
      label: "Senior Frontend Engineer",
      value: "Interview",
      delta: "Current stage",
      tone: "default",
    },
  ],
} as const satisfies StatCardConfigurationInput
