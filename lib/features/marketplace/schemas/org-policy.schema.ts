import { z } from "zod"

/**
 * Capability Registry — server-side trust boundary for org-policy
 * Server Actions. Admin-gated; the resolver treats the policy state
 * as terminal for `mandatory` and `blocked`, so admins cannot
 * cross-tenant write — `organizationId` is read from
 * `requireOrgSession`, not from the form payload.
 *
 * `audience` is the role-policy layer collapsed into a single field
 * (see plan §"Policy resolution"). `all` applies to every member,
 * `admin` to admins/owners only, `member` to non-admins only.
 */

export const policyStateSchema = z.enum(["allowed", "blocked", "mandatory"])

export const policyAudienceSchema = z.enum(["all", "admin", "member"])

export type PolicyStateInput = z.infer<typeof policyStateSchema>
export type PolicyAudienceInput = z.infer<typeof policyAudienceSchema>

const capabilityIdSchema = z.string().trim().min(1).max(128)

export const orgPolicyInputSchema = z
  .object({
    capabilityId: capabilityIdSchema,
    state: policyStateSchema,
    audience: policyAudienceSchema.default("all"),
  })
  .strict()

export type OrgPolicyInput = z.infer<typeof orgPolicyInputSchema>

export const orgPolicyDeleteInputSchema = z
  .object({
    capabilityId: capabilityIdSchema,
    audience: policyAudienceSchema.default("all"),
  })
  .strict()

export type OrgPolicyDeleteInput = z.infer<typeof orgPolicyDeleteInputSchema>
