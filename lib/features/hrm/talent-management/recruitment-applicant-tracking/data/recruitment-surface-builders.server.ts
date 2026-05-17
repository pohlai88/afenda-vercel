import "server-only"

import type {
  ListSurfaceRendererConfigurationInput,
  StatCardConfigurationInput,
} from "#features/governed-surface"

import { organizationHrmPath } from "../../../constants"
import type {
  ApplicationPipelineRow,
  JobRequisitionRow,
} from "./recruitment.queries.server"
import type { HrmApplicationStage } from "../schemas/recruitment.schema"

type RecruitmentPipelineCopy = {
  openRequisitions: string
  activeApplications: string
  interviewsQueued: string
  offersInFlight: string
}

export function buildRecruitmentPipelineStatConfiguration(input: {
  openRequisitionCount: number
  activeApplicationCount: number
  interviewQueueCount: number
  offerInFlightCount: number
  copy: RecruitmentPipelineCopy
}): StatCardConfigurationInput {
  return {
    stats: [
      {
        label: input.copy.openRequisitions,
        value: String(input.openRequisitionCount),
        delta: "Published roles",
        tone: "default",
      },
      {
        label: input.copy.activeApplications,
        value: String(input.activeApplicationCount),
        delta: "In pipeline",
        tone: "attention",
      },
      {
        label: input.copy.interviewsQueued,
        value: String(input.interviewQueueCount),
        delta: "Scheduled or pending",
        tone: "default",
      },
      {
        label: input.copy.offersInFlight,
        value: String(input.offerInFlightCount),
        delta: "Draft through sent",
        tone: "positive",
      },
    ],
  }
}

type RequisitionsListCopy = {
  pageTitle: string
  pageDescription: string
  empty: string
  colTitle: string
  colDepartment: string
  colHeadcount: string
  colStatus: string
}

export function buildRecruitmentRequisitionsListSurfaceConfiguration(
  rows: readonly JobRequisitionRow[],
  orgSlug: string,
  copy: RequisitionsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    surface: {
      header: {
        eyebrow: copy.pageTitle,
        title: copy.pageTitle,
        description: copy.pageDescription,
      },
      columnsId: "hrm-recruitment-requisitions",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "title", header: copy.colTitle },
      { id: "department", header: copy.colDepartment },
      { id: "headcount", header: copy.colHeadcount, align: "end" },
      { id: "status", header: copy.colStatus, align: "center" },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      linkColumnId: "title",
      rowHref: organizationHrmPath(orgSlug, "recruitment"),
      cells: {
        title: row.title,
        department: row.departmentName ?? "—",
        headcount: row.headcount,
        status: row.status,
      },
    })),
  }
}

type ApplicationsListCopy = {
  pageTitle: string
  pageDescription: string
  empty: string
  colCandidate: string
  colRole: string
  colStage: string
}

function formatStageLabel(stage: HrmApplicationStage): string {
  return stage.replaceAll("_", " ")
}

export function buildRecruitmentApplicationsListSurfaceConfiguration(
  rows: readonly ApplicationPipelineRow[],
  orgSlug: string,
  copy: ApplicationsListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    surface: {
      header: {
        eyebrow: copy.pageTitle,
        title: copy.pageTitle,
        description: copy.pageDescription,
      },
      columnsId: "hrm-recruitment-applications",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.empty,
      },
    },
    columns: [
      { id: "candidate", header: copy.colCandidate },
      { id: "role", header: copy.colRole },
      { id: "stage", header: copy.colStage },
    ],
    rows: rows.map((row) => ({
      id: row.id,
      linkColumnId: "candidate",
      rowHref: organizationHrmPath(orgSlug, "recruitment"),
      cells: {
        candidate: row.candidateName,
        role: row.requisitionTitle,
        stage: formatStageLabel(row.stage),
      },
    })),
  }
}
