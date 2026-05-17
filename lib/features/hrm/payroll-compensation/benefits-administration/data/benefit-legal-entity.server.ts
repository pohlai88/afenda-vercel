import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

function readLegalEntityFromExtras(extras: unknown): string | null {
  if (typeof extras !== "object" || extras === null || Array.isArray(extras)) {
    return null
  }
  const code = (extras as Record<string, unknown>).legalEntityCode
  return typeof code === "string" && code.trim() !== "" ? code.trim() : null
}

/**
 * Resolves payroll legal-entity code for benefit eligibility (HRM-BEN-003).
 */
export async function resolveEmployeeLegalEntityCode(
  organizationId: string,
  employeeId: string,
  countryCode: string | null
): Promise<string | null> {
  const [profile] = await db
    .select({
      statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
      countryCode: hrmPayrollProfile.countryCode,
    })
    .from(hrmPayrollProfile)
    .where(
      and(
        eq(hrmPayrollProfile.organizationId, organizationId),
        eq(hrmPayrollProfile.employeeId, employeeId),
        isNull(hrmPayrollProfile.effectiveTo)
      )
    )
    .limit(1)

  const fromExtras = readLegalEntityFromExtras(
    profile?.statutoryProfileExtras ?? null
  )
  if (fromExtras) return fromExtras

  // `hrm_payroll_legal_entity_config` is not in schema yet — legal entity from profile extras only.
  return null
}
