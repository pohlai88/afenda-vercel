import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitOpenEnrollment } from "#lib/db/schema"

export async function insertBenefitOpenEnrollmentWindow(params: {
  organizationId: string
  name: string
  startsOn: Date
  endsOn: Date
  planIds: string[]
  createdByUserId: string
}): Promise<{ id: string }> {
  const [row] = await db
    .insert(hrmBenefitOpenEnrollment)
    .values({
      organizationId: params.organizationId,
      name: params.name,
      startsOn: params.startsOn,
      endsOn: params.endsOn,
      planIds: params.planIds,
      createdByUserId: params.createdByUserId,
      updatedByUserId: params.createdByUserId,
    })
    .returning({ id: hrmBenefitOpenEnrollment.id })

  return { id: row.id }
}

export async function closeBenefitOpenEnrollmentWindow(params: {
  organizationId: string
  windowId: string
  updatedByUserId: string
}): Promise<boolean> {
  const [row] = await db
    .update(hrmBenefitOpenEnrollment)
    .set({
      isActive: false,
      updatedByUserId: params.updatedByUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmBenefitOpenEnrollment.organizationId, params.organizationId),
        eq(hrmBenefitOpenEnrollment.id, params.windowId)
      )
    )
    .returning({ id: hrmBenefitOpenEnrollment.id })

  return row !== undefined
}
