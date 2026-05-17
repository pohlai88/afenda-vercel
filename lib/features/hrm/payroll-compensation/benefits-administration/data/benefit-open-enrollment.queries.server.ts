import "server-only"

import type { BenefitOpenEnrollmentRow } from "./benefit-model.shared"
import type { BenefitEnrollmentWindow } from "./benefit-self-service.shared"

export type { BenefitOpenEnrollmentRow } from "./benefit-model.shared"

/** Reserved until `hrm_benefit_open_enrollment` is registered in `lib/db/schema.ts` (human migration). */
export async function listBenefitOpenEnrollmentsForOrg(
  _organizationId: string
): Promise<BenefitOpenEnrollmentRow[]> {
  return []
}

export async function findActiveBenefitOpenEnrollmentWindow(
  _organizationId: string,
  _at: Date = new Date()
): Promise<BenefitOpenEnrollmentRow | null> {
  return null
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
