import { z } from "zod"

import { ERP_FUNCTIONS } from "#features/erp-rbac"

/**
 * Serializable ERP permission gate for governed surface metadata (ADR-0026).
 * Evaluated in RSC builders — never on the client.
 */
export const erpPermissionRequirementSchema = z
  .object({
    module: z.string().trim().min(1),
    object: z.string().trim().min(1),
    function: z.enum(ERP_FUNCTIONS),
  })
  .strict()

export type ErpPermissionRequirement = z.infer<
  typeof erpPermissionRequirementSchema
>
