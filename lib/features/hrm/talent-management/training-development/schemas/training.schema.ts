import { z } from "zod"

const uuid = z.string().uuid()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const courseCode = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Z0-9][A-Z0-9_.-]*$/i, {
    message: "Use letters, numbers, dot, underscore, or hyphen.",
  })

export const HRM_TRAINING_DELIVERY_MODES = [
  "classroom",
  "online",
  "external",
  "self_paced",
  "virtual",
] as const
export type HrmTrainingDeliveryMode =
  (typeof HRM_TRAINING_DELIVERY_MODES)[number]

export const HRM_TRAINING_COURSE_STATES = [
  "draft",
  "active",
  "archived",
] as const
export type HrmTrainingCourseState = (typeof HRM_TRAINING_COURSE_STATES)[number]

export const HRM_TRAINING_SESSION_STATES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const
export type HrmTrainingSessionState =
  (typeof HRM_TRAINING_SESSION_STATES)[number]

export const HRM_TRAINING_ASSIGNMENT_STATES = [
  "assigned",
  "completed",
  "waived",
  "cancelled",
  "overdue",
] as const
export type HrmTrainingAssignmentState =
  (typeof HRM_TRAINING_ASSIGNMENT_STATES)[number]

export const HRM_TRAINING_ATTENDANCE = ["present", "absent", "excused"] as const
export type HrmTrainingAttendance = (typeof HRM_TRAINING_ATTENDANCE)[number]

export const HRM_TRAINING_ASSIGNMENT_PRIORITIES = [
  "low",
  "normal",
  "high",
  "statutory",
] as const

export const HRM_TRAINING_ASSIGNMENT_SOURCE_KINDS = [
  "manual",
  "onboarding",
  "recertification",
  "compliance_cycle",
  "session_roster",
] as const

export const HRM_TRAINING_VERIFICATION_STATES = [
  "self_attested",
  "hr_verified",
  "external_verified",
] as const

export const HRM_TRAINING_EVENT_ACTIONS = [
  "assigned",
  "completed",
  "verified",
  "waived",
  "expired",
  "reassigned",
  "cancelled",
  "session_closed",
] as const
export type HrmTrainingEventAction = (typeof HRM_TRAINING_EVENT_ACTIONS)[number]

export function normalizeTrainingCourseCode(value: string): string {
  return value.trim().toUpperCase()
}

export function computeTrainingExpiresAt(
  completedAt: Date,
  recertificationIntervalMonths: number | null | undefined
): Date | null {
  if (!recertificationIntervalMonths || recertificationIntervalMonths <= 0) {
    return null
  }
  const expires = new Date(completedAt)
  expires.setUTCMonth(expires.getUTCMonth() + recertificationIntervalMonths)
  return expires
}

export function canTransitionTrainingAssignment(
  from: HrmTrainingAssignmentState,
  to: HrmTrainingAssignmentState
): boolean {
  if (from === to) return true
  const allowed: Record<
    HrmTrainingAssignmentState,
    HrmTrainingAssignmentState[]
  > = {
    assigned: ["completed", "waived", "cancelled", "overdue"],
    overdue: ["completed", "waived", "cancelled"],
    completed: [],
    waived: [],
    cancelled: [],
  }
  return allowed[from].includes(to)
}

export const createTrainingCategoryFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  code: courseCode,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional(),
})

export const createTrainingCourseFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  code: courseCode,
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  categoryId: uuid.optional(),
  deliveryMode: z.enum(HRM_TRAINING_DELIVERY_MODES).default("classroom"),
  defaultDurationHours: z.string().trim().optional(),
  defaultCreditUnits: z.string().trim().optional(),
  statutoryFlag: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
  statutoryAuthorityCode: z.string().trim().max(64).optional(),
  recertificationIntervalMonths: z.coerce
    .number()
    .int()
    .min(0)
    .max(120)
    .optional(),
  defaultRequired: z
    .string()
    .optional()
    .transform((v) => v !== "off" && v !== "false"),
  grantsSkillId: uuid.optional(),
})

export const submitTrainingFeedbackFormSchema = z.object({
  organizationId: uuid,
  portalSlug: z.string().min(1),
  recordId: uuid,
  feedbackRating: z.coerce.number().int().min(1).max(5),
  feedbackText: z.string().trim().max(4000).optional(),
})

export const setTrainingPrerequisiteFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  courseId: uuid,
  prerequisiteCourseId: uuid,
})

export const createTrainingSessionFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  courseId: uuid,
  code: courseCode,
  title: z.string().trim().min(1).max(200),
  scheduledStartAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  scheduledEndAt: z.string().datetime({ offset: true }).or(z.string().min(1)),
  location: z.string().trim().min(1).max(500),
  meetingUrl: z.string().trim().url().optional().or(z.literal("")),
  trainerName: z.string().trim().max(200).optional(),
  trainerEmail: z.string().trim().email().optional().or(z.literal("")),
  vendorOrgId: z.string().trim().optional(),
  capacity: z.coerce.number().int().min(1).max(10_000).optional(),
})

export const assignTrainingFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  courseId: uuid,
  sessionId: uuid.optional(),
  employeeId: uuid,
  dueAt: z.string().optional(),
  required: z
    .string()
    .optional()
    .transform((v) => v !== "off" && v !== "false"),
  priority: z.enum(HRM_TRAINING_ASSIGNMENT_PRIORITIES).default("normal"),
  sourceKind: z.enum(HRM_TRAINING_ASSIGNMENT_SOURCE_KINDS).default("manual"),
})

export const completeTrainingRecordFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  assignmentId: uuid.optional(),
  courseId: uuid,
  sessionId: uuid.optional(),
  employeeId: uuid,
  completedAt: isoDate,
  instructor: z.string().trim().max(200).optional(),
  hoursCompleted: z.string().trim().optional(),
  creditUnits: z.string().trim().optional(),
  costAmount: z.string().trim().optional(),
  costCurrency: z.string().trim().length(3).default("MYR"),
  notes: z.string().trim().max(4000).optional(),
  certificateDocumentId: uuid.optional(),
  feedbackRating: z.coerce.number().int().min(1).max(5).optional(),
  feedbackText: z.string().trim().max(4000).optional(),
})

export const closeTrainingSessionFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  sessionId: uuid,
})

export const verifyTrainingRecordFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  recordId: uuid,
})

export const recordSessionAttendanceFormSchema = z.object({
  organizationId: uuid,
  orgSlug: z.string().min(1),
  assignmentId: uuid,
  attendance: z.enum(HRM_TRAINING_ATTENDANCE),
})
