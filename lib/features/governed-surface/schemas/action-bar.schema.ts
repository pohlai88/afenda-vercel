import { z } from "zod"

import type { SchemaStability } from "./_stability.shared"

import { erpPermissionRequirementSchema } from "./erp-permission-requirement.schema"
import { actionDescriptorSchema } from "./action.schema"
import { governedSurfaceChromeSchema } from "./surface-chrome.schema"

export const GOVERNED_ACTION_BAR_CONFIGURATION_SCHEMA_ID =
  "governed.action-bar.configuration" as const

export const GOVERNED_ACTION_BAR_CONFIGURATION_SCHEMA_STABILITY: SchemaStability =
  "beta"

/**
 * Action-bar data nature (ADR-0025 §2).
 *
 * `actions` — primary surface for bulk actions, page-level actions, or
 *             toolbar-style buttons. The only supported nature today; held
 *             as a single-member enum so the parity script keeps the
 *             schema / registry / cursor rule in lockstep.
 */
export const actionBarDataNatureSchema = z.enum(["actions"])
export type ActionBarDataNature = z.infer<typeof actionBarDataNatureSchema>

export const governedActionBarConfigurationSchema = z
  .object({
    dataNature: actionBarDataNatureSchema.default("actions"),
    requiresErpPermission: erpPermissionRequirementSchema.optional(),
    actions: z.array(actionDescriptorSchema).min(1),
    chrome: governedSurfaceChromeSchema.optional(),
    ariaLabel: z.string().trim().min(1).optional(),
  })
  .strict()

export type GovernedActionBarConfiguration = z.infer<
  typeof governedActionBarConfigurationSchema
>

export type GovernedActionBarConfigurationInput = z.input<
  typeof governedActionBarConfigurationSchema
>

export function parseGovernedActionBarConfiguration(raw: unknown) {
  return governedActionBarConfigurationSchema.safeParse(raw)
}
