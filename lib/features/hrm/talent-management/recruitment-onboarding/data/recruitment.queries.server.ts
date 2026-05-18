import "server-only"

import { and, count, desc, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmApplication,
  hrmInterviewScorecard,
  hrmCandidate,
  hrmDepartment,
  hrmInterview,
  hrmJobOffer,
  hrmJobPosting,
  hrmJobRequisition,
  hrmPreEmploymentCheck,
  hrmRecruitmentAssessment,
  hrmRecruitmentCommunication,
  hrmRecruitmentEvent,
  hrmScreeningQuestion,
} from "#lib/db/schema"

import { readRequisitionSkillRequirements } from "./recruitment-workflow.shared"
import type {
  HrmApplicationStage,
  HrmInterviewOutcome,
  HrmJobOfferStatus,
  HrmJobRequisitionStatus,
  HrmRecruitmentApprovalState,
  HrmScreeningOutcome,
} from "../schemas/recruitment.schema"

export type JobRequisitionRow = {
  id: string
  title: string
  departmentId: string | null
  departmentName: string | null
  headcount: number
  status: HrmJobRequisitionStatus
  requisitionType: string
  approvalState: HrmRecruitmentApprovalState
  requiredSkillCodes: readonly string[]
  createdAt: Date
}

function requisitionStatus(value: string): HrmJobRequisitionStatus {
  if (
    value === "draft" ||
    value === "pending_approval" ||
    value === "approved" ||
    value === "open" ||
    value === "filled" ||
    value === "cancelled"
  ) {
    return value
  }
  return "draft"
}

function approvalState(value: string): HrmRecruitmentApprovalState {
  if (
    value === "not_required" ||
    value === "pending" ||
    value === "approved" ||
    value === "rejected"
  ) {
    return value
  }
  return "not_required"
}

function screeningOutcome(value: string | null): HrmScreeningOutcome | null {
  if (
    value === "pending" ||
    value === "passed" ||
    value === "failed" ||
    value === "manual_review"
  ) {
    return value
  }
  return null
}

function applicationStage(value: string): HrmApplicationStage {
  const stages: readonly HrmApplicationStage[] = [
    "applied",
    "screening",
    "shortlisted",
    "interview",
    "assessment",
    "offer",
    "hired",
    "rejected",
    "withdrawn",
    "archived",
  ]
  if ((stages as readonly string[]).includes(value)) {
    return value as HrmApplicationStage
  }
  return "applied"
}

function offerStatus(value: string): HrmJobOfferStatus {
  if (
    value === "draft" ||
    value === "approved" ||
    value === "pending_approval" ||
    value === "sent" ||
    value === "accepted" ||
    value === "declined" ||
    value === "rejected" ||
    value === "withdrawn" ||
    value === "expired"
  ) {
    return value === "rejected" ? "declined" : value
  }
  return "draft"
}

function interviewOutcome(value: string | null): HrmInterviewOutcome | null {
  if (
    value === "recommended" ||
    value === "not_recommended" ||
    value === "needs_follow_up" ||
    value === "cancelled"
  ) {
    return value
  }
  return null
}

export async function listOpenJobRequisitionsForOrganization(
  organizationId: string
): Promise<JobRequisitionRow[]> {
  const rows = await listJobRequisitionsForOrg(organizationId)
  return rows.filter((row) => row.status === "open")
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
      requisitionType: hrmJobRequisition.requisitionType,
      approvalState: hrmJobRequisition.approvalState,
      audit7w1h: hrmJobRequisition.audit7w1h,
      createdAt: hrmJobRequisition.createdAt,
    })
    .from(hrmJobRequisition)
    .leftJoin(
      hrmDepartment,
      and(
        eq(hrmDepartment.id, hrmJobRequisition.departmentId),
        eq(hrmDepartment.organizationId, organizationId)
      )
    )
    .where(eq(hrmJobRequisition.organizationId, organizationId))
    .orderBy(desc(hrmJobRequisition.createdAt))

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    departmentId: r.departmentId,
    departmentName: r.departmentName,
    headcount: r.headcount,
    status: requisitionStatus(r.status),
    requisitionType: r.requisitionType,
    approvalState: approvalState(r.approvalState),
    requiredSkillCodes: readRequisitionSkillRequirements(r.audit7w1h),
    createdAt: r.createdAt,
  }))
}

export type ApplicationPipelineRow = {
  id: string
  stage: HrmApplicationStage
  candidateId: string
  candidateName: string
  candidateEmail: string | null
  requisitionTitle: string
  requisitionId: string
  convertedEmployeeId: string | null
  screeningOutcome: HrmScreeningOutcome | null
}

export async function listApplicationsForOrg(
  organizationId: string
): Promise<ApplicationPipelineRow[]> {
  const rows = await db
    .select({
      id: hrmApplication.id,
      stage: hrmApplication.stage,
      candidateId: hrmCandidate.id,
      candidateName: hrmCandidate.legalName,
      candidateEmail: hrmCandidate.email,
      requisitionTitle: hrmJobRequisition.title,
      requisitionId: hrmJobRequisition.id,
      convertedEmployeeId: hrmApplication.convertedEmployeeId,
      screeningOutcome: hrmApplication.screeningOutcome,
    })
    .from(hrmApplication)
    .innerJoin(
      hrmCandidate,
      and(
        eq(hrmCandidate.id, hrmApplication.candidateId),
        eq(hrmCandidate.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmJobRequisition,
      and(
        eq(hrmJobRequisition.id, hrmApplication.requisitionId),
        eq(hrmJobRequisition.organizationId, organizationId)
      )
    )
    .where(
      and(
        eq(hrmApplication.organizationId, organizationId),
        isNull(hrmCandidate.archivedAt)
      )
    )
    .orderBy(desc(hrmApplication.updatedAt))

  return rows.map((row) => ({
    ...row,
    stage: applicationStage(row.stage),
    screeningOutcome: screeningOutcome(row.screeningOutcome),
  }))
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

export type InterviewQueueRow = {
  id: string
  applicationId: string
  candidateName: string
  requisitionTitle: string
  interviewerUserId: string
  scheduledAt: Date
  outcome: HrmInterviewOutcome | null
}

export async function listInterviewQueueForOrg(
  organizationId: string
): Promise<InterviewQueueRow[]> {
  const rows = await db
    .select({
      id: hrmInterview.id,
      applicationId: hrmApplication.id,
      candidateName: hrmCandidate.legalName,
      requisitionTitle: hrmJobRequisition.title,
      interviewerUserId: hrmInterview.interviewerUserId,
      scheduledAt: hrmInterview.scheduledAt,
      outcome: hrmInterview.outcome,
    })
    .from(hrmInterview)
    .innerJoin(
      hrmApplication,
      and(
        eq(hrmApplication.id, hrmInterview.applicationId),
        eq(hrmApplication.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmCandidate,
      and(
        eq(hrmCandidate.id, hrmApplication.candidateId),
        eq(hrmCandidate.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmJobRequisition,
      and(
        eq(hrmJobRequisition.id, hrmApplication.requisitionId),
        eq(hrmJobRequisition.organizationId, organizationId)
      )
    )
    .where(eq(hrmInterview.organizationId, organizationId))
    .orderBy(desc(hrmInterview.scheduledAt))

  return rows.map((row) => ({
    ...row,
    outcome: interviewOutcome(row.outcome),
  }))
}

export type JobOfferRow = {
  id: string
  applicationId: string
  candidateName: string
  candidateEmail: string | null
  requisitionTitle: string
  status: HrmJobOfferStatus
  compensationAmount: string | null
  compensationCurrency: string
  proposedStartDate: Date | null
  expiresAt: Date | null
  convertedEmployeeId: string | null
}

export async function listJobOffersForOrg(
  organizationId: string
): Promise<JobOfferRow[]> {
  const rows = await db
    .select({
      id: hrmJobOffer.id,
      applicationId: hrmApplication.id,
      candidateName: hrmCandidate.legalName,
      candidateEmail: hrmCandidate.email,
      requisitionTitle: hrmJobRequisition.title,
      status: hrmJobOffer.status,
      compensationAmount: hrmJobOffer.compensationAmount,
      compensationCurrency: hrmJobOffer.compensationCurrency,
      proposedStartDate: hrmJobOffer.proposedStartDate,
      expiresAt: hrmJobOffer.expiresAt,
      convertedEmployeeId: hrmApplication.convertedEmployeeId,
    })
    .from(hrmJobOffer)
    .innerJoin(
      hrmApplication,
      and(
        eq(hrmApplication.id, hrmJobOffer.applicationId),
        eq(hrmApplication.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmCandidate,
      and(
        eq(hrmCandidate.id, hrmApplication.candidateId),
        eq(hrmCandidate.organizationId, organizationId)
      )
    )
    .innerJoin(
      hrmJobRequisition,
      and(
        eq(hrmJobRequisition.id, hrmApplication.requisitionId),
        eq(hrmJobRequisition.organizationId, organizationId)
      )
    )
    .where(eq(hrmJobOffer.organizationId, organizationId))
    .orderBy(desc(hrmJobOffer.updatedAt))

  return rows.map((row) => ({
    ...row,
    status: offerStatus(row.status),
  }))
}

export type RecruitmentEventRow = {
  id: string
  subjectKind: string
  subjectId: string
  eventType: string
  fromState: string | null
  toState: string | null
  createdAt: Date
}

export async function listRecentRecruitmentEventsForOrg(
  organizationId: string,
  limit = 20
): Promise<RecruitmentEventRow[]> {
  return db
    .select({
      id: hrmRecruitmentEvent.id,
      subjectKind: hrmRecruitmentEvent.subjectKind,
      subjectId: hrmRecruitmentEvent.subjectId,
      eventType: hrmRecruitmentEvent.eventType,
      fromState: hrmRecruitmentEvent.fromState,
      toState: hrmRecruitmentEvent.toState,
      createdAt: hrmRecruitmentEvent.createdAt,
    })
    .from(hrmRecruitmentEvent)
    .where(eq(hrmRecruitmentEvent.organizationId, organizationId))
    .orderBy(desc(hrmRecruitmentEvent.createdAt))
    .limit(limit)
}

export type RecruitmentOperationalReportRow = {
  id: string
  area: string
  count: number
  status: string
}

export async function listRecruitmentOperationalReportForOrg(
  organizationId: string
): Promise<RecruitmentOperationalReportRow[]> {
  const [
    pendingRequisitionApprovals,
    publishedPostings,
    screeningQuestions,
    assessments,
    scorecards,
    communications,
    pendingChecks,
  ] = await Promise.all([
    db
      .select({ n: count() })
      .from(hrmJobRequisition)
      .where(
        and(
          eq(hrmJobRequisition.organizationId, organizationId),
          eq(hrmJobRequisition.approvalState, "pending")
        )
      ),
    db
      .select({ n: count() })
      .from(hrmJobPosting)
      .where(
        and(
          eq(hrmJobPosting.organizationId, organizationId),
          eq(hrmJobPosting.status, "published")
        )
      ),
    db
      .select({ n: count() })
      .from(hrmScreeningQuestion)
      .where(eq(hrmScreeningQuestion.organizationId, organizationId)),
    db
      .select({ n: count() })
      .from(hrmRecruitmentAssessment)
      .where(eq(hrmRecruitmentAssessment.organizationId, organizationId)),
    db
      .select({ n: count() })
      .from(hrmInterviewScorecard)
      .where(eq(hrmInterviewScorecard.organizationId, organizationId)),
    db
      .select({ n: count() })
      .from(hrmRecruitmentCommunication)
      .where(eq(hrmRecruitmentCommunication.organizationId, organizationId)),
    db
      .select({ n: count() })
      .from(hrmPreEmploymentCheck)
      .where(
        and(
          eq(hrmPreEmploymentCheck.organizationId, organizationId),
          eq(hrmPreEmploymentCheck.status, "pending")
        )
      ),
  ])

  return [
    {
      id: "requisition-approvals",
      area: "Requisition approvals",
      count: pendingRequisitionApprovals[0]?.n ?? 0,
      status: "Pending",
    },
    {
      id: "job-postings",
      area: "Published postings",
      count: publishedPostings[0]?.n ?? 0,
      status: "Live",
    },
    {
      id: "screening",
      area: "Screening questions",
      count: screeningQuestions[0]?.n ?? 0,
      status: "Configured",
    },
    {
      id: "assessments",
      area: "Assessments",
      count: assessments[0]?.n ?? 0,
      status: "Tracked",
    },
    {
      id: "scorecards",
      area: "Interview scorecards",
      count: scorecards[0]?.n ?? 0,
      status: "Submitted",
    },
    {
      id: "communications",
      area: "Candidate communications",
      count: communications[0]?.n ?? 0,
      status: "Recorded",
    },
    {
      id: "pre-employment-checks",
      area: "Pending pre-employment checks",
      count: pendingChecks[0]?.n ?? 0,
      status: "Pending",
    },
  ]
}
