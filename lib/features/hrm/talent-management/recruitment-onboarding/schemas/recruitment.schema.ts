import { z } from "zod"

const uuid = z.string().uuid()

export const HRM_JOB_REQUISITION_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "open",
  "filled",
  "cancelled",
] as const

export const HRM_JOB_REQUISITION_TYPES = [
  "new_headcount",
  "replacement",
  "temporary",
  "contract",
  "internship",
] as const

export const HRM_RECRUITMENT_APPROVAL_STATES = [
  "not_required",
  "pending",
  "approved",
  "rejected",
] as const

export const HRM_APPLICATION_STAGES = [
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
] as const

export const HRM_INTERVIEW_OUTCOMES = [
  "recommended",
  "not_recommended",
  "needs_follow_up",
  "cancelled",
] as const

export const HRM_JOB_OFFER_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "sent",
  "accepted",
  "declined",
  "withdrawn",
  "expired",
] as const

export const HRM_JOB_POSTING_CHANNELS = [
  "internal",
  "external",
  "career_site",
  "job_board",
] as const

export const HRM_JOB_POSTING_STATUSES = [
  "draft",
  "published",
  "closed",
] as const

export const HRM_SCREENING_OUTCOMES = [
  "pending",
  "passed",
  "failed",
  "manual_review",
] as const

export const HRM_ASSESSMENT_STATUSES = [
  "assigned",
  "completed",
  "cancelled",
] as const

export const HRM_SCORECARD_RECOMMENDATIONS = [
  "strong_yes",
  "yes",
  "no",
  "strong_no",
  "hold",
] as const

export const HRM_RECRUITMENT_COMMUNICATION_TYPES = [
  "application_received",
  "interview_invitation",
  "rejection",
  "offer",
  "withdrawal",
] as const

export const HRM_PRE_EMPLOYMENT_CHECK_TYPES = [
  "reference",
  "background",
  "right_to_work",
  "medical",
] as const

export const HRM_PRE_EMPLOYMENT_CHECK_STATUSES = [
  "pending",
  "in_progress",
  "passed",
  "failed",
  "waived",
] as const

export const createJobRequisitionFormSchema = z.object({
  orgSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  requisitionType: z.enum(HRM_JOB_REQUISITION_TYPES).default("new_headcount"),
  legalEntityId: z.string().max(120).optional().or(z.literal("")),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  positionId: z.string().uuid().optional().or(z.literal("")),
  jobGradeId: z.string().uuid().optional().or(z.literal("")),
  workLocationCode: z.string().max(120).optional().or(z.literal("")),
  employmentType: z.string().max(120).optional().or(z.literal("")),
  hiringManagerUserId: z.string().uuid().optional().or(z.literal("")),
  budgetReference: z.string().max(200).optional().or(z.literal("")),
  headcount: z.coerce.number().int().min(1).max(999).optional(),
  /** Comma-separated catalog skill codes (e.g. `typescript, react`). */
  requiredSkillCodes: z.string().max(500).optional().or(z.literal("")),
})

export const requestRequisitionApprovalFormSchema = z.object({
  orgSlug: z.string().min(1),
  requisitionId: uuid,
  approverUserId: uuid.optional().or(z.literal("")),
})

export const decideRequisitionApprovalFormSchema = z.object({
  orgSlug: z.string().min(1),
  approvalId: uuid,
  decision: z.enum(["approved", "rejected"]),
  decisionNote: z.string().max(1000).optional().or(z.literal("")),
})

export const publishJobRequisitionFormSchema = z.object({
  orgSlug: z.string().min(1),
  requisitionId: uuid,
  channel: z.enum(HRM_JOB_POSTING_CHANNELS).default("career_site"),
  externalReference: z.string().max(300).optional().or(z.literal("")),
})

export const cancelJobRequisitionFormSchema = z.object({
  orgSlug: z.string().min(1),
  requisitionId: uuid,
})

export const createCandidateApplicationFormSchema = z.object({
  orgSlug: z.string().min(1),
  requisitionId: uuid,
  legalName: z.string().min(1).max(200),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(64).optional().or(z.literal("")),
  source: z.string().max(120).optional().or(z.literal("")),
})

export const advanceApplicationStageFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid,
  stage: z.enum(HRM_APPLICATION_STAGES),
})

export const scheduleInterviewFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid,
  interviewerUserId: uuid,
  scheduledAt: z.string().min(1),
})

export const submitInterviewFeedbackFormSchema = z.object({
  orgSlug: z.string().min(1),
  interviewId: uuid,
  outcome: z.enum(HRM_INTERVIEW_OUTCOMES),
  feedback: z.string().max(4000).optional().or(z.literal("")),
})

export const submitInterviewScorecardFormSchema = z.object({
  orgSlug: z.string().min(1),
  interviewId: uuid,
  recommendation: z.enum(HRM_SCORECARD_RECOMMENDATIONS),
  overallRating: z.coerce.number().int().min(1).max(5).optional(),
  comments: z.string().max(4000).optional().or(z.literal("")),
})

export const evaluateScreeningFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid,
  outcome: z.enum(HRM_SCREENING_OUTCOMES),
  notes: z.string().max(2000).optional().or(z.literal("")),
})

export const recordAssessmentResultFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid,
  assessmentType: z.string().min(1).max(120),
  status: z.enum(HRM_ASSESSMENT_STATUSES),
  score: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid score.")
    .optional()
    .or(z.literal("")),
  result: z.string().max(2000).optional().or(z.literal("")),
  providerReference: z.string().max(300).optional().or(z.literal("")),
})

export const recordRecruitmentCommunicationFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid.optional().or(z.literal("")),
  candidateId: uuid.optional().or(z.literal("")),
  communicationType: z.enum(HRM_RECRUITMENT_COMMUNICATION_TYPES),
  recipient: z.string().max(300).optional().or(z.literal("")),
  providerReference: z.string().max(300).optional().or(z.literal("")),
})

export const recordPreEmploymentCheckFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid,
  checkType: z.enum(HRM_PRE_EMPLOYMENT_CHECK_TYPES),
  status: z.enum(HRM_PRE_EMPLOYMENT_CHECK_STATUSES),
  result: z.string().max(2000).optional().or(z.literal("")),
  providerReference: z.string().max(300).optional().or(z.literal("")),
})

export const createJobOfferFormSchema = z.object({
  orgSlug: z.string().min(1),
  applicationId: uuid,
  compensationAmount: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount.")
    .optional()
    .or(z.literal("")),
  compensationCurrency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .default("MYR")
    .transform((value) => value.toUpperCase()),
  proposedStartDate: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(4000).optional().or(z.literal("")),
})

export const updateJobOfferStatusFormSchema = z.object({
  orgSlug: z.string().min(1),
  offerId: uuid,
  status: z.enum(HRM_JOB_OFFER_STATUSES),
})

export const convertAcceptedOfferFormSchema = z.object({
  orgSlug: z.string().min(1),
  offerId: uuid,
  employeeNumber: z.string().trim().min(1).max(64),
})

export type CreateJobRequisitionFormInput = z.infer<
  typeof createJobRequisitionFormSchema
>

export type ScheduleInterviewFormInput = z.infer<
  typeof scheduleInterviewFormSchema
>

export type HrmJobRequisitionStatus =
  (typeof HRM_JOB_REQUISITION_STATUSES)[number]
export type HrmJobRequisitionType = (typeof HRM_JOB_REQUISITION_TYPES)[number]
export type HrmRecruitmentApprovalState =
  (typeof HRM_RECRUITMENT_APPROVAL_STATES)[number]
export type HrmApplicationStage = (typeof HRM_APPLICATION_STAGES)[number]
export type HrmInterviewOutcome = (typeof HRM_INTERVIEW_OUTCOMES)[number]
export type HrmJobOfferStatus = (typeof HRM_JOB_OFFER_STATUSES)[number]
export type HrmJobPostingChannel = (typeof HRM_JOB_POSTING_CHANNELS)[number]
export type HrmScreeningOutcome = (typeof HRM_SCREENING_OUTCOMES)[number]
export type HrmAssessmentStatus = (typeof HRM_ASSESSMENT_STATUSES)[number]
export type HrmScorecardRecommendation =
  (typeof HRM_SCORECARD_RECOMMENDATIONS)[number]
export type HrmRecruitmentCommunicationType =
  (typeof HRM_RECRUITMENT_COMMUNICATION_TYPES)[number]
export type HrmPreEmploymentCheckType =
  (typeof HRM_PRE_EMPLOYMENT_CHECK_TYPES)[number]
export type HrmPreEmploymentCheckStatus =
  (typeof HRM_PRE_EMPLOYMENT_CHECK_STATUSES)[number]
