import { z } from "zod"

export const BOARDING_KINDS = ["onboarding", "offboarding"] as const
export const BOARDING_TEMPLATE_STATUSES = [
  "draft",
  "active",
  "archived",
] as const
export const BOARDING_STATUSES = [
  "pending",
  "in_progress",
  "blocked",
  "completed",
  "cancelled",
] as const
export const BOARDING_TASK_STATUSES = [
  "pending",
  "in_progress",
  "blocked",
  "completed",
  "waived",
  "cancelled",
] as const
export const BOARDING_TASK_CATEGORIES = [
  "hr",
  "payroll",
  "access",
  "asset",
  "document",
  "employee",
  "finance",
  "manager",
  "admin",
  "handover",
  "leave_attendance",
  "claims_advance",
  "vacancy",
  "compliance",
] as const

export type BoardingKind = (typeof BOARDING_KINDS)[number]
export type BoardingTemplateStatus = (typeof BOARDING_TEMPLATE_STATUSES)[number]
export type BoardingStatus = (typeof BOARDING_STATUSES)[number]
export type BoardingTaskStatus = (typeof BOARDING_TASK_STATUSES)[number]
export type BoardingTaskCategory = (typeof BOARDING_TASK_CATEGORIES)[number]

const uuid = z.string().uuid()
const optionalUuid = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  uuid.optional()
)
const optionalText = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().max(2000).optional()
)

export const boardingKindSchema = z.enum(BOARDING_KINDS)
export const boardingTemplateStatusSchema = z.enum(BOARDING_TEMPLATE_STATUSES)
export const boardingStatusSchema = z.enum(BOARDING_STATUSES)
export const boardingTaskStatusSchema = z.enum(BOARDING_TASK_STATUSES)
export const boardingTaskCategorySchema = z.enum(BOARDING_TASK_CATEGORIES)

export const boardingTaskActionFormSchema = z.object({
  orgSlug: z.string().min(1),
  taskId: uuid,
  note: optionalText,
  evidenceDocumentId: optionalUuid,
})

export const waiveBoardingTaskFormSchema = boardingTaskActionFormSchema.extend({
  waiverReason: z.string().trim().min(3).max(2000),
})

export const createBoardingTemplateFormSchema = z.object({
  orgSlug: z.string().min(1),
  kind: boardingKindSchema,
  code: z
    .string()
    .trim()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9_-]*$/),
  title: z.string().trim().min(2).max(200),
  description: optionalText,
  status: boardingTemplateStatusSchema.default("draft"),
})

export const updateBoardingTemplateFormSchema =
  createBoardingTemplateFormSchema.extend({
    templateId: uuid,
  })

export type BoardingTaskActionFormInput = z.infer<
  typeof boardingTaskActionFormSchema
>
export type WaiveBoardingTaskFormInput = z.infer<
  typeof waiveBoardingTaskFormSchema
>
export type CreateBoardingTemplateFormInput = z.infer<
  typeof createBoardingTemplateFormSchema
>
export type UpdateBoardingTemplateFormInput = z.infer<
  typeof updateBoardingTemplateFormSchema
>
