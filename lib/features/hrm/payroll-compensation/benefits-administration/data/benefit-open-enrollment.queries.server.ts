import "server-only"

import { and, desc, eq, gte, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmBenefitOpenEnrollment } from "#lib/db/schema"

import type { BenefitOpenEnrollmentRow } from "./benefit-model.shared"
import type { BenefitEnrollmentWindow } from "./benefit-self-service.shared"

export type { BenefitOpenEnrollmentRow } from "./benefit-model.shared"

export async function listBenefitOpenEnrollmentsForOrg(
  organizationId: string
): Promise<BenefitOpenEnrollmentRow[]> {
  return db
    .select({
      id: hrmBenefitOpenEnrollment.id,
      organizationId: hrmBenefitOpenEnrollment.organizationId,
      name: hrmBenefitOpenEnrollment.name,
      startsOn: hrmBenefitOpenEnrollment.startsOn,
      endsOn: hrmBenefitOpenEnrollment.endsOn,
      planIds: hrmBenefitOpenEnrollment.planIds,
      isActive: hrmBenefitOpenEnrollment.isActive,
      createdAt: hrmBenefitOpenEnrollment.createdAt,
      updatedAt: hrmBenefitOpenEnrollment.updatedAt,
    })
    .from(hrmBenefitOpenEnrollment)
    .where(eq(hrmBenefitOpenEnrollment.organizationId, organizationId))
    .orderBy(desc(hrmBenefitOpenEnrollment.startsOn))
}

export async function findActiveBenefitOpenEnrollmentWindow(
  organizationId: string,
  at: Date = new Date()
): Promise<BenefitOpenEnrollmentRow | null> {
  const [row] = await db
    .select({
      id: hrmBenefitOpenEnrollment.id,
      organizationId: hrmBenefitOpenEnrollment.organizationId,
      name: hrmBenefitOpenEnrollment.name,
      startsOn: hrmBenefitOpenEnrollment.startsOn,
      endsOn: hrmBenefitOpenEnrollment.endsOn,
      planIds: hrmBenefitOpenEnrollment.planIds,
      isActive: hrmBenefitOpenEnrollment.isActive,
      createdAt: hrmBenefitOpenEnrollment.createdAt,
      updatedAt: hrmBenefitOpenEnrollment.updatedAt,
    })
    .from(hrmBenefitOpenEnrollment)
    .where(
      and(
        eq(hrmBenefitOpenEnrollment.organizationId, organizationId),
        eq(hrmBenefitOpenEnrollment.isActive, true),
        lte(hrmBenefitOpenEnrollment.startsOn, at),
        gte(hrmBenefitOpenEnrollment.endsOn, at)
      )
    )
    .orderBy(desc(hrmBenefitOpenEnrollment.startsOn))
    .limit(1)

  return row ?? null
}

export function toBenefitEnrollmentWindow(
  row: BenefitOpenEnrollmentRow
): BenefitEnrollmentWindow {
  return {
    id: row.id,
    kind: "open_enrollment",
    opensAt: row.startsOn,
    closesAt: row.endsOn,
    planIds: row.planIds,
  }
}
