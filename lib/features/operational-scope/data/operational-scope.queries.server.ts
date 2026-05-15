import "server-only"

import { and, asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgOperationalScopePolicy, userOperationalScope } from "#lib/db/schema"

/**
 * Returns all org-level scope policies for an organization, ordered by displayOrder.
 * Return type is inferred from Drizzle — callers cast to OrgOperationalScopePolicyRow as needed.
 */
export async function listOrgScopePolicies(organizationId: string) {
  return db
    .select()
    .from(orgOperationalScopePolicy)
    .where(eq(orgOperationalScopePolicy.organizationId, organizationId))
    .orderBy(asc(orgOperationalScopePolicy.displayOrder))
}

/**
 * Returns all user operational scope rows for a (org, user) pair, ordered by displayOrder.
 */
export async function listUserOperationalScopes(
  organizationId: string,
  userId: string
) {
  return db
    .select()
    .from(userOperationalScope)
    .where(
      and(
        eq(userOperationalScope.organizationId, organizationId),
        eq(userOperationalScope.userId, userId)
      )
    )
    .orderBy(asc(userOperationalScope.displayOrder))
}

/**
 * Upserts a user operational scope row (pin or set selection).
 */
export async function upsertUserOperationalScope(input: {
  organizationId: string
  userId: string
  scopeType: string
  selectedId?: string | null
  selectedLabel?: string | null
  selectedSlug?: string | null
  displayOrder?: number
  pinned?: boolean
}): Promise<void> {
  await db
    .insert(userOperationalScope)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      scopeType: input.scopeType,
      selectedId: input.selectedId ?? null,
      selectedLabel: input.selectedLabel ?? null,
      selectedSlug: input.selectedSlug ?? null,
      displayOrder: input.displayOrder ?? 0,
      pinned: input.pinned ?? false,
    })
    .onConflictDoUpdate({
      target: [
        userOperationalScope.organizationId,
        userOperationalScope.userId,
        userOperationalScope.scopeType,
      ],
      set: {
        selectedId: input.selectedId ?? null,
        selectedLabel: input.selectedLabel ?? null,
        selectedSlug: input.selectedSlug ?? null,
        ...(input.displayOrder !== undefined
          ? { displayOrder: input.displayOrder }
          : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        updatedAt: new Date(),
      },
    })
}

/**
 * Removes a user operational scope row (unpin + clear selection).
 */
export async function deleteUserOperationalScope(input: {
  organizationId: string
  userId: string
  scopeType: string
}): Promise<void> {
  await db
    .delete(userOperationalScope)
    .where(
      and(
        eq(userOperationalScope.organizationId, input.organizationId),
        eq(userOperationalScope.userId, input.userId),
        eq(userOperationalScope.scopeType, input.scopeType)
      )
    )
}

/**
 * Upserts an org-level scope policy row.
 */
export async function upsertOrgOperationalScopePolicy(input: {
  organizationId: string
  scopeType: string
  policy: string
  audience: string
  displayOrder: number
  updatedByUserId: string
}): Promise<void> {
  await db
    .insert(orgOperationalScopePolicy)
    .values({
      organizationId: input.organizationId,
      scopeType: input.scopeType,
      policy: input.policy,
      audience: input.audience,
      displayOrder: input.displayOrder,
      updatedByUserId: input.updatedByUserId,
    })
    .onConflictDoUpdate({
      target: [
        orgOperationalScopePolicy.organizationId,
        orgOperationalScopePolicy.scopeType,
        orgOperationalScopePolicy.audience,
      ],
      set: {
        policy: input.policy,
        displayOrder: input.displayOrder,
        updatedByUserId: input.updatedByUserId,
        updatedAt: new Date(),
      },
    })
}
