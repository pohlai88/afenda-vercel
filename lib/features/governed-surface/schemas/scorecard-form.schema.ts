import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { governedMetadataSchemaVersionSchema } from "./schema-version.shared"
import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_SCORECARD_FORM_SCHEMA_ID =
  "governed.scorecard-form.configuration" as const

export const GOVERNED_SCORECARD_FORM_SCHEMA_STABILITY: SchemaStability = "beta"

/** Scorecard / rubric data nature (ADR-0025 §2). */
export const scorecardFormDataNatureSchema = z.literal("scoring")
export type ScorecardFormDataNature = z.infer<
  typeof scorecardFormDataNatureSchema
>

export const scorecardCriterionSchema = z
  .object({
    id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    maxScore: z.number().int().positive().finite().default(5),
  })
  .strict()

export const governedScorecardFormConfigurationSchema =
  governedMetadataSchemaVersionSchema
    .extend({
      dataNature: scorecardFormDataNatureSchema.default("scoring"),
      formId: z.string().trim().min(1),
      actionId: z.string().trim().min(1),
      title: z.string().trim().min(1),
      criteria: z.array(scorecardCriterionSchema).min(1),
      notesFieldId: z.string().trim().min(1).optional(),
      submitLabel: z.string().trim().min(1).default("Submit feedback"),
      chrome: governedSurfaceChromeSchema.optional(),
    })
    .superRefine((form, ctx) => {
      const seen = new Set<string>()

      for (const [index, criterion] of form.criteria.entries()) {
        if (seen.has(criterion.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Criterion ids must be unique.",
            path: ["criteria", index, "id"],
          })
        }

        seen.add(criterion.id)
      }
    })

export type ScorecardCriterion = z.infer<typeof scorecardCriterionSchema>

export type GovernedScorecardFormConfiguration = z.infer<
  typeof governedScorecardFormConfigurationSchema
>

export type GovernedScorecardFormConfigurationInput = z.input<
  typeof governedScorecardFormConfigurationSchema
>

export function parseGovernedScorecardFormConfiguration(raw: unknown) {
  return governedScorecardFormConfigurationSchema.safeParse(raw)
}
