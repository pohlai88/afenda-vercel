import "server-only"

import type {
  ListSurfaceRendererConfigurationInput,
  StatCardConfigurationInput,
} from "#features/governed-surface"
import {
  buildKanbanWorkflowFromColumnTransitions,
  type GovernedKanbanBoardConfigurationInput,
} from "#features/governed-surface"
import { GOVERNED_METADATA_SCHEMA_VERSION } from "#features/governed-surface/schemas/schema-version.shared"

import { organizationHrmPath } from "../../../constants"
import {
  RECRUITMENT_READ_PERMISSION,
  RECRUITMENT_TABLE_PRESENTATION,
} from "./recruitment-list-surface.shared"
import type {
  ApplicationPipelineRow,
  JobRequisitionRow,
} from "./recruitment.queries.server"
import {
  HRM_APPLICATION_STAGES,
  type HrmApplicationStage,
} from "../schemas/recruitment.schema"
import { APPLICATION_STAGE_TRANSITIONS } from "./recruitment-workflow.shared"

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
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    presentation: RECRUITMENT_TABLE_PRESENTATION,
    surface: {
      header: { title: "hrm-recruitment-requisitions" },
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
    __schemaVersion: GOVERNED_METADATA_SCHEMA_VERSION,
    dataNature: "table",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    presentation: RECRUITMENT_TABLE_PRESENTATION,
    surface: {
      header: { title: "hrm-recruitment-applications" },
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

type PipelineKanbanCopy = {
  boardAriaLabel: string
  stageLabels: Record<HrmApplicationStage, string>
  pipelineEmpty: string
  interviewCount: (count: number) => string
  convertedEmployee: string
}

export function buildRecruitmentPipelineKanbanConfiguration(
  rows: readonly ApplicationPipelineRow[],
  interviewCounts: ReadonlyMap<string, number>,
  copy: PipelineKanbanCopy
): GovernedKanbanBoardConfigurationInput {
  const columns = HRM_APPLICATION_STAGES.map((stage) => ({
    id: stage,
    label: copy.stageLabels[stage],
    badgeTone:
      stage === "offer" || stage === "hired"
        ? ("positive" as const)
        : stage === "rejected" || stage === "withdrawn"
          ? ("critical" as const)
          : stage === "interview" || stage === "assessment"
            ? ("attention" as const)
            : undefined,
  }))

  return {
    dataNature: "kanban",
    interactionMode: "footer-actions",
    requiresErpPermission: RECRUITMENT_READ_PERMISSION,
    copy: {
      boardAriaLabel: copy.boardAriaLabel,
      emptyColumn: copy.pipelineEmpty,
    },
    workflow: buildKanbanWorkflowFromColumnTransitions(
      APPLICATION_STAGE_TRANSITIONS
    ),
    columns,
    columnOrder: [...HRM_APPLICATION_STAGES],
    cards: rows.map((row) => {
      const interviewN = interviewCounts.get(row.id) ?? 0
      const badges: string[] = []
      if (interviewN > 0) {
        badges.push(copy.interviewCount(interviewN))
      }
      if (row.convertedEmployeeId) {
        badges.push(`${copy.convertedEmployee}: ${row.convertedEmployeeId}`)
      }
      return {
        id: row.id,
        columnId: row.stage,
        title: row.candidateName,
        subtitle: row.requisitionTitle,
        badges: badges.length > 0 ? badges : undefined,
      }
    }),
  }
}
