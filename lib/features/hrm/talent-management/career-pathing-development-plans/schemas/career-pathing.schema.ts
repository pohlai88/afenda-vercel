import { z } from "zod"

export const CAREER_PATH_KINDS = [
  "vertical",
  "lateral",
  "specialist",
  "leadership",
  "functional",
  "cross_functional",
] as const

export const CAREER_PATH_STATUSES = ["draft", "active", "archived"] as const

export const DEVELOPMENT_GOAL_TYPES = [
  "skill",
  "competency",
  "certification",
  "leadership",
  "project",
  "mentoring",
  "coaching",
] as const

export const DEVELOPMENT_GOAL_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
  "overdue",
  "blocked",
  "cancelled",
  "deferred",
] as const

export const READINESS_LEVELS = [
  "not_ready",
  "developing",
  "near_ready",
  "ready",
  "role_ready",
] as const

export const TARGET_ROLE_SOURCES = ["employee", "manager", "hr"] as const

const orgTenantFields = {
  organizationId: z.string().min(1),
  orgSlug: z.string().min(1),
}

export function normalizeCareerPathCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "_").slice(0, 24)
}

export const createCareerPathFrameworkFormSchema = z.object({
  ...orgTenantFields,
  code: z.string().min(1).max(24),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  pathKind: z.enum(CAREER_PATH_KINDS),
})

export const updateCareerPathFrameworkStatusFormSchema = z.object({
  ...orgTenantFields,
  frameworkId: z.string().uuid(),
  status: z.enum(CAREER_PATH_STATUSES),
})

export const createCareerPathStageFormSchema = z.object({
  ...orgTenantFields,
  frameworkId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  targetGradeRef: z.string().max(120).optional(),
  expectedMonths: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? undefined : value,
    z.coerce.number().int().min(1).max(600).optional()
  ),
})

export const deleteCareerPathStageFormSchema = z.object({
  ...orgTenantFields,
  stageId: z.string().uuid(),
})

export const upsertCareerAspirationFormSchema = z.object({
  ...orgTenantFields,
  employeeId: z.string().uuid(),
  preferredRoleTitle: z.string().max(200).optional(),
  preferredDepartmentRef: z.string().max(120).optional(),
  preferredLocationRef: z.string().max(120).optional(),
  mobilityPreference: z.string().max(200).optional(),
  notes: z.string().max(4000).optional(),
})

export const createTargetRoleFormSchema = z.object({
  ...orgTenantFields,
  employeeId: z.string().uuid(),
  frameworkId: z.string().uuid().optional(),
  targetRoleTitle: z.string().min(1).max(200),
  jobFamilyRef: z.string().max(120).optional(),
  gradeRef: z.string().max(120).optional(),
  positionRef: z.string().max(120).optional(),
  departmentRef: z.string().max(120).optional(),
  source: z.enum(TARGET_ROLE_SOURCES).default("employee"),
})

export const createDevelopmentPlanFormSchema = z.object({
  ...orgTenantFields,
  employeeId: z.string().uuid(),
  targetRoleId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
})

export const createDevelopmentGoalFormSchema = z.object({
  ...orgTenantFields,
  planId: z.string().uuid(),
  title: z.string().min(1).max(200),
  goalType: z.enum(DEVELOPMENT_GOAL_TYPES),
  targetDate: z.string().optional(),
  priority: z.string().max(40).optional(),
})

export const updateDevelopmentGoalStatusFormSchema = z.object({
  ...orgTenantFields,
  goalId: z.string().uuid(),
  status: z.enum(DEVELOPMENT_GOAL_STATUSES),
})

export const createDevelopmentMilestoneFormSchema = z.object({
  ...orgTenantFields,
  goalId: z.string().uuid(),
  title: z.string().min(1).max(200),
  targetDate: z.string().optional(),
  completionCriteria: z.string().max(2000).optional(),
})

export const updateMilestoneStatusFormSchema = z.object({
  ...orgTenantFields,
  milestoneId: z.string().uuid(),
  status: z.enum(DEVELOPMENT_GOAL_STATUSES),
})

export const createLearningActionFormSchema = z.object({
  ...orgTenantFields,
  goalId: z.string().uuid(),
  title: z.string().min(1).max(200),
  trainingCourseId: z.string().uuid().optional(),
  externalRef: z.string().max(200).optional(),
})

export const createStretchAssignmentFormSchema = z.object({
  ...orgTenantFields,
  planId: z.string().uuid(),
  title: z.string().min(1).max(200),
  assignmentKind: z.enum([
    "project",
    "acting_role",
    "leadership_exposure",
    "cross_functional",
  ]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().max(4000).optional(),
})

export const assignMentorFormSchema = z.object({
  ...orgTenantFields,
  planId: z.string().uuid(),
  mentorEmployeeId: z.string().uuid(),
})

export const assignCoachFormSchema = z.object({
  ...orgTenantFields,
  planId: z.string().uuid(),
  coachEmployeeId: z.string().uuid(),
  objective: z.string().max(2000).optional(),
})

export const createDevelopmentSessionFormSchema = z.object({
  ...orgTenantFields,
  planId: z.string().uuid(),
  sessionKind: z.enum(["mentor", "coach"]),
  sessionDate: z.string().min(1),
  notes: z.string().max(4000).optional(),
  actions: z.string().max(4000).optional(),
  outcome: z.string().max(2000).optional(),
})

export const createCareerDiscussionFormSchema = z.object({
  ...orgTenantFields,
  employeeId: z.string().uuid(),
  planId: z.string().uuid().optional(),
  discussionDate: z.string().min(1),
  participants: z.string().max(500).optional(),
  notes: z.string().max(4000).optional(),
  agreedActions: z.string().max(4000).optional(),
  nextReviewDate: z.string().optional(),
})

export const updateManagerReviewFormSchema = z.object({
  ...orgTenantFields,
  planId: z.string().uuid(),
  managerReviewNote: z.string().max(4000),
})

export type CareerPathingMutationFormState =
  | { ok: true }
  | { ok: false; errors: Record<string, string | undefined> }
