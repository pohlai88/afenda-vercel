import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { orgPushSubscription } from "#lib/db/schema"

export async function upsertOrgPushSubscription(input: {
  organizationId: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent: string | null
}): Promise<void> {
  const now = new Date()
  await db
    .insert(orgPushSubscription)
    .values({
      organizationId: input.organizationId,
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: orgPushSubscription.endpoint,
      set: {
        organizationId: input.organizationId,
        userId: input.userId,
        p256dh: input.p256dh,
        auth: input.auth,
        userAgent: input.userAgent,
        updatedAt: now,
      },
    })
}

export async function deleteOrgPushSubscriptionForUser(input: {
  organizationId: string
  userId: string
  endpoint?: string | null
}): Promise<void> {
  const conditions = [
    eq(orgPushSubscription.organizationId, input.organizationId),
    eq(orgPushSubscription.userId, input.userId),
  ]
  if (input.endpoint?.trim()) {
    conditions.push(eq(orgPushSubscription.endpoint, input.endpoint.trim()))
  }
  await db.delete(orgPushSubscription).where(and(...conditions))
}
