import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

export const GOVERNED_FORM_RULES_SCHEMA_ID =
  "governed.form-rules.configuration" as const

export const GOVERNED_FORM_RULES_SCHEMA_STABILITY: SchemaStability = "beta"

/** JSON Forms–style effects (server-evaluated in builders; client mirrors for wizards). */
export const formRuleEffectSchema = z.enum(["SHOW", "HIDE", "DISABLE", "ENABLE"])

export type FormRuleEffect = z.infer<typeof formRuleEffectSchema>

export const formRuleFieldConditionSchema = z
  .object({
    scope: z.literal("field"),
    fieldId: z.string().trim().min(1),
    equals: z.union([z.string(), z.number(), z.boolean()]),
  })
  .strict()

export type FormRuleFieldCondition = z.infer<typeof formRuleFieldConditionSchema>

export type FormRuleAndCondition = {
  scope: "and"
  conditions: FormRuleCondition[]
}

export type FormRuleOrCondition = {
  scope: "or"
  conditions: FormRuleCondition[]
}

export type FormRuleCondition =
  | FormRuleFieldCondition
  | FormRuleAndCondition
  | FormRuleOrCondition

export const formRuleConditionSchema: z.ZodType<FormRuleCondition> = z.lazy(() =>
  z.discriminatedUnion("scope", [
    formRuleFieldConditionSchema,
    z
      .object({
        scope: z.literal("and"),
        conditions: z.array(formRuleConditionSchema).min(1),
      })
      .strict(),
    z
      .object({
        scope: z.literal("or"),
        conditions: z.array(formRuleConditionSchema).min(1),
      })
      .strict(),
  ])
)

export const formRuleSchema = z
  .object({
    effect: formRuleEffectSchema,
    condition: formRuleConditionSchema,
  })
  .strict()

export type FormRule = z.infer<typeof formRuleSchema>

export function parseFormRuleData(raw: unknown) {
  return formRuleSchema.safeParse(raw)
}
