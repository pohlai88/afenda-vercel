import { z } from "zod"

import {
  PLANNER_ITEM_LIFECYCLES,
  PLANNER_OWNERSHIP_ROLES,
  PLANNER_RELATION_TYPES,
  PLANNER_SIGNAL_CLASSES,
  PLANNER_SIGNAL_LIFECYCLES,
  PLANNER_SIGNAL_RESOLUTION_POLICIES,
  PLANNER_VIEW_SORT_MODES,
} from "../constants"
import { plannerViewFilterStateSchema } from "../filters/planner-view-filter.shared"

const plannerDimensionSchema = z.coerce.number().int().min(0).max(5)

export const plannerPressureDimensionsSchema = z.object({
  urgency: plannerDimensionSchema.default(2),
  impact: plannerDimensionSchema.default(2),
  severity: plannerDimensionSchema.default(2),
  confidence: plannerDimensionSchema.default(3),
  effort: plannerDimensionSchema.default(2),
  escalationLevel: plannerDimensionSchema.default(1),
  temporalProximity: plannerDimensionSchema.default(1),
  ownershipPressure: plannerDimensionSchema.default(1),
})

export const plannerSignalClassSchema = z.enum(PLANNER_SIGNAL_CLASSES)
export const plannerSignalLifecycleSchema = z.enum(PLANNER_SIGNAL_LIFECYCLES)
export const plannerItemLifecycleSchema = z.enum(PLANNER_ITEM_LIFECYCLES)
export const plannerOwnershipRoleSchema = z.enum(PLANNER_OWNERSHIP_ROLES)
export const plannerRelationTypeSchema = z.enum(PLANNER_RELATION_TYPES)
export const plannerViewSortModeSchema = z.enum(PLANNER_VIEW_SORT_MODES)
export const plannerSignalResolutionPolicySchema = z.enum(
  PLANNER_SIGNAL_RESOLUTION_POLICIES
)
export const plannerSavedViewSurfaceSchema = z.enum([
  "queue",
  "timeline",
  "signals",
])

const optionalDateTimeField = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value && value.length > 0 ? new Date(value) : null))
  .refine((value) => value === null || !Number.isNaN(value.getTime()), {
    message: "Invalid date",
  })

export const createPlannerSignalFormSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  signalClass: plannerSignalClassSchema.default("manual_capture"),
})

export const createPlannerItemFormSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(4000).optional(),
  dueAt: optionalDateTimeField,
  pressure: plannerPressureDimensionsSchema.partial().default({}),
})

export const transitionPlannerItemFormSchema = z.object({
  itemId: z.string().uuid(),
  lifecycle: plannerItemLifecycleSchema,
  correlatedSignalPolicy: plannerSignalResolutionPolicySchema.optional(),
  closeActiveNotices: z
    .preprocess((value) => value === "on" || value === "true", z.boolean())
    .optional(),
  resolutionNote: z.string().trim().max(1000).optional(),
})

export const promotePlannerSignalFormSchema = z.object({
  signalId: z.string().uuid(),
})

export const transitionPlannerSignalFormSchema = z.object({
  signalId: z.string().uuid(),
  lifecycle: plannerSignalLifecycleSchema,
})

export const startPlannerSessionFormSchema = z.object({
  itemId: z.string().uuid().optional(),
})

export const stopPlannerSessionFormSchema = z.object({
  sessionId: z.string().uuid(),
})

export const upsertPlannerScheduleFormSchema = z.object({
  itemId: z.string().uuid(),
  scheduleStartAt: optionalDateTimeField,
  scheduledEndAt: optionalDateTimeField,
  dueAt: optionalDateTimeField,
  snoozedUntil: optionalDateTimeField,
  timeZone: z.string().trim().max(100).optional(),
})

export const upsertPlannerReminderFormSchema = z.object({
  itemId: z.string().uuid(),
  remindAt: optionalDateTimeField.refine((value) => value instanceof Date, {
    message: "Reminder time is required",
  }),
  snoozedUntil: optionalDateTimeField,
})

export const upsertPlannerRecurrenceFormSchema = z.object({
  itemId: z.string().uuid(),
  rrule: z.string().trim().min(1).max(255),
  timeZone: z.string().trim().max(100).optional(),
  nextRunAt: optionalDateTimeField,
})

export const assignPlannerOwnershipFormSchema = z
  .object({
    itemId: z.string().uuid(),
    role: plannerOwnershipRoleSchema,
    subjectUserId: z.string().trim().max(255).optional(),
    subjectLabel: z.string().trim().max(255).optional(),
  })
  .refine(
    (value) =>
      Boolean(value.subjectUserId && value.subjectUserId.length > 0) ||
      Boolean(value.subjectLabel && value.subjectLabel.length > 0),
    {
      message: "An assignee reference is required",
      path: ["subjectLabel"],
    }
  )

export const createPlannerLinkFormSchema = z.object({
  itemId: z.string().uuid(),
  module: z.string().trim().min(1).max(100),
  entityType: z.string().trim().min(1).max(100),
  entityId: z.string().trim().min(1).max(255),
  displayLabel: z.string().trim().min(1).max(255),
  href: z.string().trim().url().optional().or(z.literal("")),
  causalityReason: z.string().trim().max(1000).optional(),
})

export const addPlannerCommentFormSchema = z.object({
  itemId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
})

export const addPlannerAttachmentMetadataFormSchema = z.object({
  itemId: z.string().uuid(),
  blobUrl: z.string().trim().url(),
  payloadHash: z.string().trim().length(64),
  mimeType: z.string().trim().min(1).max(255),
  sizeBytes: z.coerce
    .number()
    .int()
    .min(1)
    .max(50 * 1024 * 1024),
})

export const savePlannerViewFormSchema = z.object({
  viewId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120).optional(),
  surface: plannerSavedViewSurfaceSchema,
  filterState: z.string().trim().min(2),
  sortMode: plannerViewSortModeSchema.optional(),
})

export const createPlannerRelationFormSchema = z
  .object({
    itemId: z.string().uuid(),
    relationType: plannerRelationTypeSchema,
    relatedItemId: z.string().uuid().optional(),
    relatedSignalId: z.string().uuid().optional(),
  })
  .refine(
    (value) =>
      Number(Boolean(value.relatedItemId)) +
        Number(Boolean(value.relatedSignalId)) ===
      1,
    {
      message: "Choose exactly one related item or signal.",
      path: ["relatedItemId"],
    }
  )

export const correlatePlannerSignalFormSchema = z.object({
  signalId: z.string().uuid(),
  itemId: z.string().uuid(),
})

export const deletePlannerViewFormSchema = z.object({
  viewId: z.string().uuid(),
})

export function parsePlannerViewFilterJson(raw: string) {
  try {
    return plannerViewFilterStateSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}
