import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmPayComponentCountryTreatment,
  hrmPayrollExchangeRate,
  hrmPayrollLegalEntityConfig,
} from "#lib/db/schema"

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
  const existing = await db
    .select({ id: hrmPayrollLegalEntityConfig.id })
    .from(hrmPayrollLegalEntityConfig)
    .where(
      and(
        eq(hrmPayrollLegalEntityConfig.organizationId, input.organizationId),
        eq(
          hrmPayrollLegalEntityConfig.legalEntityCode,
          input.config.legalEntityCode
        )
      )
    )
    .limit(1)

  const values = {
    countryCode: input.config.countryCode.toUpperCase(),
    registrationNumber: input.config.registrationNumber?.trim() || null,
    defaultPayrollCurrency: input.config.defaultPayrollCurrency.toUpperCase(),
    payrollCountryCode: input.config.payrollCountryCode.toUpperCase(),
    isActive: input.config.isActive,
    updatedByUserId: input.userId,
    updatedAt: new Date(),
  }

  if (existing[0]) {
    await db
      .update(hrmPayrollLegalEntityConfig)
      .set(values)
      .where(eq(hrmPayrollLegalEntityConfig.id, existing[0].id))
    return { id: existing[0].id, created: false }
  }

  const [inserted] = await db
    .insert(hrmPayrollLegalEntityConfig)
    .values({
      organizationId: input.organizationId,
      legalEntityCode: input.config.legalEntityCode.trim(),
      ...values,
      createdByUserId: input.userId,
    })
    .returning({ id: hrmPayrollLegalEntityConfig.id })

  if (!inserted) {
    throw new Error("Failed to create legal entity payroll configuration.")
  }

  return { id: inserted.id, created: true }
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
  const effectiveFrom = toUtcDate(input.treatment.effectiveFrom)
  const effectiveTo = input.treatment.effectiveTo
    ? toUtcDate(input.treatment.effectiveTo)
    : null

  const existing = await db
    .select({ id: hrmPayComponentCountryTreatment.id })
    .from(hrmPayComponentCountryTreatment)
    .where(
      and(
        eq(
          hrmPayComponentCountryTreatment.organizationId,
          input.organizationId
        ),
        eq(
          hrmPayComponentCountryTreatment.countryCode,
          input.treatment.countryCode.toUpperCase()
        ),
        eq(
          hrmPayComponentCountryTreatment.componentCode,
          input.treatment.componentCode
        ),
        eq(hrmPayComponentCountryTreatment.effectiveFrom, effectiveFrom)
      )
    )
    .limit(1)

  const values = {
    taxable: input.treatment.taxable,
    contributable: input.treatment.contributable,
    pensionable: input.treatment.pensionable,
    effectiveTo,
    updatedByUserId: input.userId,
    updatedAt: new Date(),
  }

  if (existing[0]) {
    await db
      .update(hrmPayComponentCountryTreatment)
      .set(values)
      .where(eq(hrmPayComponentCountryTreatment.id, existing[0].id))
    return { id: existing[0].id, created: false }
  }

  const [inserted] = await db
    .insert(hrmPayComponentCountryTreatment)
    .values({
      organizationId: input.organizationId,
      countryCode: input.treatment.countryCode.toUpperCase(),
      componentCode: input.treatment.componentCode,
      effectiveFrom,
      ...values,
      createdByUserId: input.userId,
    })
    .returning({ id: hrmPayComponentCountryTreatment.id })

  if (!inserted) {
    throw new Error("Failed to save pay component country treatment.")
  }

  return { id: inserted.id, created: true }
}
