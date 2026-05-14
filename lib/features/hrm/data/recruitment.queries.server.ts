import "server-only"

import { and, count, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApplication,
  hrmCandidate,
  hrmDepartment,
  hrmInterview,
  hrmJobRequisition,
} from "#lib/db/schema"

export type JobRequisitionRow = {
  id: string
  title: string
  departmentId: string | null
  departmentName: string | null
  headcount: number
  status: string
  createdAt: Date
}

export async function listJobRequisitionsForOrg(
  organizationId: string
): Promise<JobRequisitionRow[]> {
  const rows = await db
    .select({
      id: hrmJobRequisition.id,
      title: hrmJobRequisition.title,
      departmentId: hrmJobRequisition.departmentId,
      departmentName: hrmDepartment.name,
      headcount: hrmJobRequisition.headcount,
      status: hrmJobRequisition.status,
      createdAt: hrmJobRequisition.createdAt,
    })
    .from(hrmJobRequisition)
    .leftJoin(
      hrmDepartment,
      eq(hrmDepartment.id, hrmJobRequisition.departmentId)
    )
    .where(eq(hrmJobRequisition.organizationId, organizationId))
    .orderBy(desc(hrmJobRequisition.createdAt))

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    departmentId: r.departmentId,
    departmentName: r.departmentName,
    headcount: r.headcount,
    status: r.status,
    createdAt: r.createdAt,
  }))
}

export type ApplicationPipelineRow = {
  id: string
  stage: string
  candidateName: string
  candidateEmail: string | null
  requisitionTitle: string
  requisitionId: string
}

export async function listApplicationsForOrg(
  organizationId: string
): Promise<ApplicationPipelineRow[]> {
  const rows = await db
    .select({
      id: hrmApplication.id,
      stage: hrmApplication.stage,
      candidateName: hrmCandidate.legalName,
      candidateEmail: hrmCandidate.email,
      requisitionTitle: hrmJobRequisition.title,
      requisitionId: hrmJobRequisition.id,
    })
    .from(hrmApplication)
    .innerJoin(hrmCandidate, eq(hrmCandidate.id, hrmApplication.candidateId))
    .innerJoin(
      hrmJobRequisition,
      eq(hrmJobRequisition.id, hrmApplication.requisitionId)
    )
    .where(
      and(
        eq(hrmApplication.organizationId, organizationId),
        isNull(hrmCandidate.archivedAt)
      )
    )
    .orderBy(desc(hrmApplication.updatedAt))

  return rows
}

export async function getInterviewCountsForOrg(
  organizationId: string
): Promise<Map<string, number>> {
  const rows = await db
    .select({
      applicationId: hrmInterview.applicationId,
      n: count(),
    })
    .from(hrmInterview)
    .where(eq(hrmInterview.organizationId, organizationId))
    .groupBy(hrmInterview.applicationId)

  return new Map(rows.map((r) => [r.applicationId, r.n]))
}
