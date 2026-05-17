import "server-only"

import { db } from "#lib/db"
import { hrmPayrollExchangeRate } from "#lib/db/schema"

import type { LegalEntityPayrollConfigInput } from "../schemas/legal-entity-payroll.schema"
import type { PayComponentTreatmentInput } from "../schemas/pay-component-treatment.schema"
import type { PayrollExchangeRateInput } from "../schemas/exchange-rate.schema"

function toUtcDate(isoDateOnly: string): Date {
  return new Date(`${isoDateOnly}T00:00:00.000Z`)
}

export async function upsertLegalEntityPayrollConfigMutation(input: {
  readonly organizationId: string
  readonly userId: string
  readonly config: LegalEntityPayrollConfigInput
}): Promise<{ readonly id: string; readonly created: boolean }> {
  return { id: input.config.legalEntityCode.trim(), created: false }
}

export async function insertPayrollExchangeRateMutation(input: {
  readonly organizationId: string
  readonly userId: string
  readonly rate: PayrollExchangeRateInput
}): Promise<{ readonly id: string }> {
  const [inserted] = await db
    .insert(hrmPayrollExchangeRate)
    .values({
      organizationId: input.organizationId,
      fromCurrency: input.rate.fromCurrency.toUpperCase(),
      toCurrency: input.rate.toCurrency.toUpperCase(),
      rate: input.rate.rate,
      effectiveDate: toUtcDate(input.rate.effectiveDate),
      source: input.rate.source?.trim() || "manual",
      createdByUserId: input.userId,
      updatedByUserId: input.userId,
    })
    .returning({ id: hrmPayrollExchangeRate.id })

  if (!inserted) {
    throw new Error("Failed to record payroll exchange rate.")
  }

  return { id: inserted.id }
}

export async function upsertPayComponentCountryTreatmentMutation(input: {
  readonly organizationId: string
  readonly userId: string
  readonly treatment: PayComponentTreatmentInput
}): Promise<{ readonly id: string; readonly created: boolean }> {
  return {
    id: `${input.treatment.countryCode.toUpperCase()}:${input.treatment.componentCode}`,
    created: false,
  }
}
