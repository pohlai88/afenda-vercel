import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_APPROVAL_TIMELINE_SCHEMA_ID =
  "governed.approval-timeline.configuration" as const

export const GOVERNED_APPROVAL_TIMELINE_SCHEMA_STABILITY: SchemaStability =
  "beta"

export const approvalTimelineStepStatusSchema = z.enum([
  "pending",
  "active",
  "complete",
  "rejected",
  "skipped",
])

export const approvalTimelineStepSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    status: approvalTimelineStepStatusSchema,
    actorLabel: z.string().trim().min(1).optional(),
    occurredAt: z.string().datetime({ offset: true }).optional(),
    note: z.string().trim().min(1).optional(),
  })
  .strict()

export const governedApprovalTimelineConfigurationSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    steps: z.array(approvalTimelineStepSchema).min(1),
    chrome: governedSurfaceChromeSchema.optional(),
  })
  .strict()
  .superRefine((config, ctx) => {
    const seen = new Set<string>()

    for (const [index, step] of config.steps.entries()) {
      if (seen.has(step.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Step ids must be unique.",
          path: ["steps", index, "id"],
        })
      }

      seen.add(step.id)
    }
  })

export type ApprovalTimelineStepStatus = z.infer<
  typeof approvalTimelineStepStatusSchema
>

export type ApprovalTimelineStep = z.infer<typeof approvalTimelineStepSchema>

export type GovernedApprovalTimelineConfiguration = z.infer<
  typeof governedApprovalTimelineConfigurationSchema
>

export type GovernedApprovalTimelineConfigurationInput = z.input<
  typeof governedApprovalTimelineConfigurationSchema
>

export function parseGovernedApprovalTimelineConfiguration(raw: unknown) {
  return governedApprovalTimelineConfigurationSchema.safeParse(raw)
}
