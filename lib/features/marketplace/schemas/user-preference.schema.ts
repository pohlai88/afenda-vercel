import { z } from "zod"

/**
 * Capability Registry — server-side trust boundary for user-preference
 * Server Actions. The action's only ambient inputs from the client are
 * a `capabilityId` and a desired `state`; the `(organizationId,
 * userId)` tuple comes from `requireOrgSession` and is never accepted
 * from the request payload (closes the IDOR vector for cross-tenant
 * preference writes).
 */

export const preferenceStateSchema = z.enum(["visible", "hidden"])

export type PreferenceStateInput = z.infer<typeof preferenceStateSchema>

const capabilityIdSchema = z.string().trim().min(1).max(128)

export const userPreferenceInputSchema = z
  .object({
    capabilityId: capabilityIdSchema,
    state: preferenceStateSchema,
  })
  .strict()

export type UserPreferenceInput = z.infer<typeof userPreferenceInputSchema>
