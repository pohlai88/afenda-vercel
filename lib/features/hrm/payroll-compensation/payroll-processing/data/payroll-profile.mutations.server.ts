import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile } from "#lib/db/schema"

import {
  calendarDayBeforeIso,
  isoDateOnlyToUtcDate,
} from "../../../hrm-calendar-dates.server"
import { mergeMalaysiaPcbIntoStatutoryProfileExtras } from "../schemas/malaysia-pcb-statutory-extras.shared"

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
  /** MY LHDN TP1/TP3 (MYR/month); ignored unless `countryCode === "MY"`. */
  pcbTp1AdditionalReliefMonthlyMyr?: string | undefined
  pcbTp3AdditionalDeductionMonthlyMyr?: string | undefined
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
        statutoryProfileExtras: hrmPayrollProfile.statutoryProfileExtras,
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
          effectiveTo: isoDateOnlyToUtcDate(
            calendarDayBeforeIso(input.effectiveFrom)
          ),
          updatedAt: new Date(),
          updatedByUserId: input.actorUserId,
        })
        .where(eq(hrmPayrollProfile.id, current.id))
    }

    const priorExtras = current?.statutoryProfileExtras ?? null
    const pcbPatch =
      input.countryCode === "MY"
        ? {
            pcbTp1AdditionalReliefMonthlyMyr:
              input.pcbTp1AdditionalReliefMonthlyMyr ?? null,
            pcbTp3AdditionalDeductionMonthlyMyr:
              input.pcbTp3AdditionalDeductionMonthlyMyr ?? null,
          }
        : {
            pcbTp1AdditionalReliefMonthlyMyr: null,
            pcbTp3AdditionalDeductionMonthlyMyr: null,
          }
    const mergedExtrasRecord = mergeMalaysiaPcbIntoStatutoryProfileExtras(
      priorExtras,
      pcbPatch
    )
    const statutoryProfileExtras =
      Object.keys(mergedExtrasRecord).length === 0 ? null : mergedExtrasRecord

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
      statutoryProfileExtras,
      effectiveFrom: nextEffective,
      effectiveTo: null,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })

    return { ok: true, profileId: id }
  })
}
