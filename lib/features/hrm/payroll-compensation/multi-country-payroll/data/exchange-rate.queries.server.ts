import "server-only"

import { and, desc, eq, isNull, lte } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollExchangeRate } from "#lib/db/schema"

export type ResolvedExchangeRate = {
  readonly fromCurrency: string
  readonly toCurrency: string
  readonly rate: string
  readonly effectiveDate: string
  readonly source: string
}

/**
 * Resolves FX for reporting consolidation (HRM-MCP-009).
 * Prefers org-specific rate, then platform-wide (organizationId null).
 */
export async function resolveExchangeRate(input: {
  readonly organizationId: string
  readonly fromCurrency: string
  readonly toCurrency: string
  readonly atDate: Date
}): Promise<ResolvedExchangeRate | null> {
  const from = input.fromCurrency.toUpperCase()
  const to = input.toCurrency.toUpperCase()
  if (from === to) {
    return {
      fromCurrency: from,
      toCurrency: to,
      rate: "1",
      effectiveDate: input.atDate.toISOString().slice(0, 10),
      source: "identity",
    }
  }

  const atDate = new Date(`${input.atDate.toISOString().slice(0, 10)}T00:00:00.000Z`)

  for (const orgFilter of [input.organizationId, null] as const) {
    const conditions = [
      eq(hrmPayrollExchangeRate.fromCurrency, from),
      eq(hrmPayrollExchangeRate.toCurrency, to),
      lte(hrmPayrollExchangeRate.effectiveDate, atDate),
    ]
    if (orgFilter === null) {
      conditions.push(isNull(hrmPayrollExchangeRate.organizationId))
    } else {
      conditions.push(eq(hrmPayrollExchangeRate.organizationId, orgFilter))
    }

    const row = await db
      .select({
        fromCurrency: hrmPayrollExchangeRate.fromCurrency,
        toCurrency: hrmPayrollExchangeRate.toCurrency,
        rate: hrmPayrollExchangeRate.rate,
        effectiveDate: hrmPayrollExchangeRate.effectiveDate,
        source: hrmPayrollExchangeRate.source,
      })
      .from(hrmPayrollExchangeRate)
      .where(and(...conditions))
      .orderBy(desc(hrmPayrollExchangeRate.effectiveDate))
      .limit(1)

    const hit = row[0]
    if (hit) {
      return {
        fromCurrency: hit.fromCurrency,
        toCurrency: hit.toCurrency,
        rate: String(hit.rate),
        effectiveDate: hit.effectiveDate.toISOString().slice(0, 10),
        source: hit.source,
      }
    }
  }

  return null
}
