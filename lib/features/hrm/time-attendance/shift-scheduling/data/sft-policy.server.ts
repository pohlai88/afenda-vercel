import "server-only"

import { eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmShiftSchedulingPolicy } from "#lib/db/schema"

export type ShiftSchedulingPolicyRow = {
  readonly id: string
  readonly organizationId: string
  readonly minRestMinutesBetweenShifts: number
  readonly maxScheduledMinutesPerWeek: number
  readonly warnOnConflict: boolean
  readonly blockOnConflict: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export async function getOrCreateShiftSchedulingPolicy(
  organizationId: string
): Promise<ShiftSchedulingPolicyRow> {
  const existing = await db
    .select()
    .from(hrmShiftSchedulingPolicy)
    .where(eq(hrmShiftSchedulingPolicy.organizationId, organizationId))
    .limit(1)

  if (existing[0]) {
    return existing[0]
  }

  const id = crypto.randomUUID()
  const [created] = await db
    .insert(hrmShiftSchedulingPolicy)
    .values({
      id,
      organizationId,
    })
    .returning()

  if (!created) {
    throw new Error("Failed to create shift scheduling policy")
  }

  return created
}
