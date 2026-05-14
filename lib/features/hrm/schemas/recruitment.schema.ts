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
  "interview",
  "offer",
  "hired",
  "rejected",
] as const

export const createJobRequisitionFormSchema = z.object({
  orgSlug: z.string().min(1),
  title: z.string().min(1).max(200),
  departmentId: z.string().uuid().optional().or(z.literal("")),
  headcount: z.coerce.number().int().min(1).max(999).optional(),
})

export const publishJobRequisitionFormSchema = z.object({
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

export type CreateJobRequisitionFormInput = z.infer<
  typeof createJobRequisitionFormSchema
>

export type ScheduleInterviewFormInput = z.infer<
  typeof scheduleInterviewFormSchema
>
