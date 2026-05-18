import "server-only"

import type {
  ListSurfaceRendererConfigurationInput,
  StatCardConfigurationInput,
} from "#features/governed-surface"
import {
  candidatePortalCareersApplyPath,
  candidatePortalCareersDetailPath,
} from "#lib/portal"

import type { JobRequisitionRow } from "../../recruitment-onboarding/data/recruitment.queries.server"

type CareersListCopy = {
  pageTitle: string
  pageDescription: string
  emptyTitle: string
  colTitle: string
  colDepartment: string
  colHeadcount: string
  colStatus: string
  statusOpen: string
}

export function buildCandidateCareersListSurfaceConfiguration(
  rows: readonly JobRequisitionRow[],
  portalSlug: string,
  copy: CareersListCopy
): ListSurfaceRendererConfigurationInput {
  return {
    dataNature: "table",
    presentation: {
      variant: "table-only",
      tableDensity: "comfortable",
    },
    surface: {
      header: {
        eyebrow: copy.pageTitle,
        title: copy.pageTitle,
        description: copy.pageDescription,
      },
      columnsId: "cssp-careers",
      rowKey: "id",
      empty: {
        variant: "muted",
        title: copy.emptyTitle,
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
      rowHref: candidatePortalCareersDetailPath(portalSlug, row.id),
      cells: {
        title: row.title,
        department: row.departmentName ?? "—",
        headcount: row.headcount,
        status: copy.statusOpen,
      },
    })),
  }
}

type ApplicationStatusCopy = {
  requisitionTitle: string
  stageLabel: string
}

export function buildCandidateApplicationStatusStatConfiguration(
  copy: ApplicationStatusCopy
): StatCardConfigurationInput {
  return {
    stats: [
      {
        label: copy.requisitionTitle,
        value: copy.stageLabel,
        delta: "Current stage",
        tone: "default",
      },
    ],
  }
}

type CareersDetailCopy = {
  title: string
  department: string
  headcount: string
  skills: string
}

export function buildCandidateCareersDetailStatConfiguration(
  row: JobRequisitionRow,
  copy: CareersDetailCopy
): StatCardConfigurationInput {
  const skills =
    row.requiredSkillCodes.length > 0
      ? row.requiredSkillCodes.join(", ")
      : copy.skills

  return {
    stats: [
      {
        label: copy.department,
        value: row.title,
        delta: `${copy.headcount}: ${row.headcount}`,
        tone: "default",
      },
      {
        label: "Skills",
        value: skills,
        delta: "Self-declare on apply",
        tone: "attention",
      },
    ],
  }
}

export function candidateCareersApplyHref(
  portalSlug: string,
  requisitionId: string
): string {
  return candidatePortalCareersApplyPath(portalSlug, requisitionId)
}
