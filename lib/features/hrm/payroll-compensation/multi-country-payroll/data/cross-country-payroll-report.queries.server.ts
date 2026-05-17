import "server-only"

import { and, eq, gte, inArray, lte } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmPayrollPeriod,
  hrmPayrollProfile,
  hrmPayrollRun,
} from "#lib/db/schema"

import { resolveExchangeRate } from "./exchange-rate.queries.server"

export type CrossCountryPayrollReportRow = {
  readonly countryCode: string
  readonly payCurrency: string
  readonly payrollGroupCode: string
  readonly legalEntityCode: string
  readonly periodId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly runCount: number
  readonly grossPay: string
  readonly netPay: string
  readonly employerCost: string
  readonly reportingCurrency: string | null
  readonly grossPayReporting: string | null
  readonly employerCostReporting: string | null
}

export type CrossCountryPayrollReport = {
  readonly rows: readonly CrossCountryPayrollReportRow[]
  readonly reportingCurrency: string | null
}

function sumDecimal(values: readonly string[]): string {
  const total = values.reduce((acc, v) => acc + Number.parseFloat(v || "0"), 0)
  return total.toFixed(2)
}

function applyFx(amount: string, rate: string): string {
  const n = Number.parseFloat(amount) * Number.parseFloat(rate)
  return Number.isFinite(n) ? n.toFixed(2) : amount
}

/**
 * Aggregates locked/finalized/posted payroll by country, currency, and pay group (HRM-MCP-026/027).
 */
export async function getCrossCountryPayrollReport(input: {
  readonly organizationId: string
  readonly periodStart: string
  readonly periodEnd: string
  readonly reportingCurrency?: string
}): Promise<CrossCountryPayrollReport> {
  const finalizedStates = ["locked", "finalized", "posted"] as const

  const periods = await db
    .select({
      id: hrmPayrollPeriod.id,
      periodStart: hrmPayrollPeriod.periodStart,
      periodEnd: hrmPayrollPeriod.periodEnd,
    })
    .from(hrmPayrollPeriod)
    .where(
      and(
        eq(hrmPayrollPeriod.organizationId, input.organizationId),
        gte(hrmPayrollPeriod.periodStart, input.periodStart),
        lte(hrmPayrollPeriod.periodEnd, input.periodEnd),
        inArray(hrmPayrollPeriod.state, [...finalizedStates])
      )
    )

  if (periods.length === 0) {
    return { rows: [], reportingCurrency: input.reportingCurrency ?? null }
  }

  const periodIds = periods.map((p) => p.id)
  const periodById = new Map(periods.map((p) => [p.id, p] as const))

  const runs = await db
    .select({
      periodId: hrmPayrollRun.periodId,
      grossPay: hrmPayrollRun.grossPay,
      netPay: hrmPayrollRun.netPay,
      employerCost: hrmPayrollRun.employerCost,
      countryCode: hrmPayrollProfile.countryCode,
      payCurrency: hrmPayrollProfile.payCurrency,
      payrollGroupCode: hrmPayrollProfile.payrollGroupCode,
    })
    .from(hrmPayrollRun)
    .leftJoin(
      hrmPayrollProfile,
      eq(hrmPayrollRun.profileId, hrmPayrollProfile.id)
    )
    .where(
      and(
        eq(hrmPayrollRun.organizationId, input.organizationId),
        inArray(hrmPayrollRun.periodId, periodIds)
      )
    )

  type BucketKey = string
  const buckets = new Map<
    BucketKey,
    {
      countryCode: string
      payCurrency: string
      payrollGroupCode: string
      periodId: string
      gross: string[]
      net: string[]
      employer: string[]
    }
  >()

  for (const run of runs) {
    const period = periodById.get(run.periodId)
    if (!period) continue

    const countryCode = run.countryCode?.trim() || "MY"
    const payCurrency = run.payCurrency?.trim() || "MYR"
    const payrollGroupCode =
      run.payrollGroupCode?.trim() || "default"

    const key = `${run.periodId}|${countryCode}|${payCurrency}|${payrollGroupCode}`
    const bucket = buckets.get(key) ?? {
      countryCode,
      payCurrency,
      payrollGroupCode,
      periodId: run.periodId,
      gross: [],
      net: [],
      employer: [],
    }
    bucket.gross.push(String(run.grossPay))
    bucket.net.push(String(run.netPay))
    bucket.employer.push(String(run.employerCost))
    buckets.set(key, bucket)
  }

  const atDate = new Date(`${input.periodEnd.slice(0, 10)}T00:00:00.000Z`)
  const reportingCurrency = input.reportingCurrency?.toUpperCase() ?? null

  const rows: CrossCountryPayrollReportRow[] = []

  for (const bucket of buckets.values()) {
    const period = periodById.get(bucket.periodId)!
    const grossPay = sumDecimal(bucket.gross)
    const netPay = sumDecimal(bucket.net)
    const employerCost = sumDecimal(bucket.employer)

    let grossPayReporting: string | null = null
    let employerCostReporting: string | null = null

    if (reportingCurrency && reportingCurrency !== bucket.payCurrency) {
      const fx = await resolveExchangeRate({
        organizationId: input.organizationId,
        fromCurrency: bucket.payCurrency,
        toCurrency: reportingCurrency,
        atDate,
      })
      if (fx) {
        grossPayReporting = applyFx(grossPay, fx.rate)
        employerCostReporting = applyFx(employerCost, fx.rate)
      }
    } else if (reportingCurrency) {
      grossPayReporting = grossPay
      employerCostReporting = employerCost
    }

    rows.push({
      countryCode: bucket.countryCode,
      payCurrency: bucket.payCurrency,
      payrollGroupCode: bucket.payrollGroupCode,
      legalEntityCode: "default",
      periodId: bucket.periodId,
      periodStart:
        typeof period.periodStart === "string"
          ? period.periodStart.slice(0, 10)
          : (period.periodStart as Date).toISOString().slice(0, 10),
      periodEnd:
        typeof period.periodEnd === "string"
          ? period.periodEnd.slice(0, 10)
          : (period.periodEnd as Date).toISOString().slice(0, 10),
      runCount: bucket.gross.length,
      grossPay,
      netPay,
      employerCost,
      reportingCurrency,
      grossPayReporting,
      employerCostReporting,
    })
  }

  rows.sort((a, b) => {
    const c = a.countryCode.localeCompare(b.countryCode)
    if (c !== 0) return c
    return a.periodEnd.localeCompare(b.periodEnd)
  })

  return { rows, reportingCurrency }
}
