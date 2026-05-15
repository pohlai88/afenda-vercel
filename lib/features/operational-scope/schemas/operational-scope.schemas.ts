import { z } from "zod"

import { isValidScopeType } from "#lib/erp/operational-scope-registry.shared"
import { ORG_SCOPE_AUDIENCES, ORG_SCOPE_POLICIES } from "../constants"

/** Runtime-validated scopeType — checked against the live registry. */
export const scopeTypeSchema = z.string().min(1).refine(isValidScopeType, {
  message:
    "Unknown scope type. It must be registered in the operational scope registry.",
})

export const orgScopePolicySchema = z.enum(ORG_SCOPE_POLICIES)
export const orgScopeAudienceSchema = z.enum(ORG_SCOPE_AUDIENCES)

export const setUserScopeSelectionSchema = z.object({
  scopeType: scopeTypeSchema,
  selectedId: z.string().min(1).nullable(),
  selectedLabel: z.string().max(200).nullable(),
  selectedSlug: z.string().max(200).nullable(),
})

export const pinScopeSchema = z.object({
  scopeType: scopeTypeSchema,
  displayOrder: z.number().int().min(0).default(0),
})

export const unpinScopeSchema = z.object({
  scopeType: scopeTypeSchema,
})

export const setOrgScopePolicySchema = z.object({
  scopeType: scopeTypeSchema,
  policy: orgScopePolicySchema,
  audience: orgScopeAudienceSchema.default("all"),
  displayOrder: z.number().int().min(0).default(0),
})

export type UserScopeActionInput = z.infer<typeof setUserScopeSelectionSchema>
