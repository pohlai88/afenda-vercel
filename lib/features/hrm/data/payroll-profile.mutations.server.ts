import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

import {
  calendarDayBeforeIso,
  isoDateOnlyToUtcDate,
} from "./hrm-calendar-dates.server"

export type UpsertPayrollProfileMutationInput = {
  organizationId: string
  employeeId: string
  actorUserId: string
  effectiveFrom: string
  countryCode: string
  taxResidencyCountry?: string | null
  taxIdentifierType?: string | null
  taxIdentifierNumber?: string | null
  epfNumber?: string | null
  socsoNumber?: string | null
  eisEligible: boolean
  pcbCategory?: string | null
  hrdfApplicable: boolean
  bankCode?: string | null
  bankAccountTokenized?: string | null
  bankAccountHolderName?: string | null
  paySchedule: string
  payCurrency: string
  payrollGroupCode?: string | null
}

export async function upsertPayrollProfileMutation(
  input: UpsertPayrollProfileMutationInput
): Promise<
  | { ok: true; profileId: string }
  | { ok: false; code: "effective_from_invalid"; message: string }
> {
  const nextEffective = isoDateOnlyToUtcDate(input.effectiveFrom)

  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({
        id: hrmPayrollProfile.id,
        effectiveFrom: hrmPayrollProfile.effectiveFrom,
      })
      .from(hrmPayrollProfile)
      .where(
        and(
          eq(hrmPayrollProfile.organizationId, input.organizationId),
          eq(hrmPayrollProfile.employeeId, input.employeeId),
          isNull(hrmPayrollProfile.effectiveTo)
        )
      )
      .limit(1)

    if (current) {
      if (current.effectiveFrom.getTime() >= nextEffective.getTime()) {
        return {
          ok: false,
          code: "effective_from_invalid",
          message:
            "Effective-from must be strictly after the current profile start date.",
        }
      }
      await tx
        .update(hrmPayrollProfile)
        .set({
          effectiveTo: isoDateOnlyToUtcDate(calendarDayBeforeIso(input.effectiveFrom)),
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmPayrollProfile.id, current.id))
    }

    const id = crypto.randomUUID()
    await tx.insert(hrmPayrollProfile).values({
      id,
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      countryCode: input.countryCode,
      taxResidencyCountry: input.taxResidencyCountry ?? null,
      taxIdentifierType: input.taxIdentifierType ?? null,
      taxIdentifierNumber: input.taxIdentifierNumber ?? null,
      epfNumber: input.epfNumber ?? null,
      socsoNumber: input.socsoNumber ?? null,
      eisEligible: input.eisEligible,
      pcbCategory: input.pcbCategory ?? null,
      hrdfApplicable: input.hrdfApplicable,
      bankCode: input.bankCode ?? null,
      bankAccountTokenized: input.bankAccountTokenized ?? null,
      bankAccountHolderName: input.bankAccountHolderName ?? null,
      paySchedule: input.paySchedule,
      payCurrency: input.payCurrency,
      payrollGroupCode: input.payrollGroupCode ?? null,
      effectiveFrom: nextEffective,
      effectiveTo: null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })

    return { ok: true, profileId: id }
  })
}
