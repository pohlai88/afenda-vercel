import "server-only"

import { cache } from "react"
import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { neonAuthMember, neonAuthOrganization } from "#lib/db/schema-neon-auth"

export type {
  BetterAuthSessionUserLike,
  IamSessionUserFields,
} from "./org-membership.shared"
export { mapIamSessionUser } from "./org-membership.shared"

/** True when the user holds a membership row for the organization. */
export async function hasOrgMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: neonAuthMember.id })
    .from(neonAuthMember)
    .where(
      and(
        eq(neonAuthMember.userId, userId),
        eq(neonAuthMember.organizationId, organizationId)
      )
    )
    .limit(1)

  return Boolean(row)
}

/** Throws when membership is missing — used before mutating active org on session. */
export async function assertOrgMembership(
  userId: string,
  organizationId: string
): Promise<void> {
  if (!(await hasOrgMembership(userId, organizationId))) {
    throw new Error("Not a member of the requested organization.")
  }
}

export const findOrganizationIdBySlug = cache(
  async (orgSlug: string): Promise<string | null> => {
    const [org] = await db
      .select({ id: neonAuthOrganization.id })
      .from(neonAuthOrganization)
      .where(eq(neonAuthOrganization.slug, orgSlug))
      .limit(1)

    return org?.id ?? null
  }
)
