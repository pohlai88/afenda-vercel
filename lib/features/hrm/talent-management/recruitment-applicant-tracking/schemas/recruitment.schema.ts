import { z } from "zod"

const uuid = z.string().uuid()

export const HRM_JOB_REQUISITION_STATUSES = [
  "draft",
  "open",
  "filled",
  "cancelled",
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
  "approved",
  "sent",
  "accepted",
  "rejected",
  "withdrawn",
] as const

export const createJobRequisitionFormSchema = z.object({
  orgSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  positionId: z.string().uuid().optional().or(z.literal("")),
  headcount: z.coerce.number().int().min(1).max(999).optional(),
  /** Comma-separated catalog skill codes (e.g. `typescript, react`). */
  requiredSkillCodes: z.string().max(500).optional().or(z.literal("")),
})

export const publishJobRequisitionFormSchema = z.object({
  orgSlug: z.string().min(1),
  requisitionId: uuid,
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
export type HrmApplicationStage = (typeof HRM_APPLICATION_STAGES)[number]
export type HrmInterviewOutcome = (typeof HRM_INTERVIEW_OUTCOMES)[number]
export type HrmJobOfferStatus = (typeof HRM_JOB_OFFER_STATUSES)[number]
