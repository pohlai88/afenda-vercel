import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmPayrollProfile, hrmPayrollRun } from "#lib/db/schema"

import { toHrmPayrollProfileStub } from "./payroll-profile-stub.shared"
import {
  assessCountryPayrollReadiness,
  type CountryPayrollReadinessResult,
} from "./statutory-readiness.server"

export type PayrollRunCountryReadiness = {
  readonly runId: string
  readonly employeeId: string
  readonly countryCode: string
  readonly ready: boolean
  readonly issues: CountryPayrollReadinessResult["issues"]
}

export type PayrollPeriodCountryReadiness = {
  readonly missingProfileCount: number
  readonly notReadyRunCount: number
  readonly byCountry: ReadonlyMap<string, { ready: number; notReady: number }>
  readonly runs: readonly PayrollRunCountryReadiness[]
}

/**
 * Batch statutory readiness for all runs in a period (HRM-MCP-015/016).
 */
export async function assessPayrollPeriodCountryReadiness(input: {
  readonly organizationId: string
  readonly periodId: string
  readonly periodEnd: string
}): Promise<PayrollPeriodCountryReadiness> {
  const periodEnd = new Date(`${input.periodEnd.slice(0, 10)}T00:00:00.000Z`)

  const rows = await db
    .select({
      runId: hrmPayrollRun.id,
      employeeId: hrmPayrollRun.employeeId,
      profileId: hrmPayrollRun.profileId,
      countryCode: hrmPayrollProfile.countryCode,
      taxIdentifierNumber: hrmPayrollProfile.taxIdentifierNumber,
      epfNumber: hrmPayrollProfile.epfNumber,
      socsoNumber: hrmPayrollProfile.socsoNumber,
      payCurrency: hrmPayrollProfile.payCurrency,
      taxResidencyCountry: hrmPayrollProfile.taxResidencyCountry,
    })
    .from(hrmPayrollRun)
    .leftJoin(
      hrmPayrollProfile,
      eq(hrmPayrollRun.profileId, hrmPayrollProfile.id)
    )
    .where(
      and(
        eq(hrmPayrollRun.organizationId, input.organizationId),
        eq(hrmPayrollRun.periodId, input.periodId)
      )
    )

  const byCountry = new Map<string, { ready: number; notReady: number }>()
  const runResults: PayrollRunCountryReadiness[] = []
  let missingProfileCount = 0
  let notReadyRunCount = 0

  for (const row of rows) {
    if (!row.profileId) {
      missingProfileCount += 1
      notReadyRunCount += 1
      runResults.push({
        runId: row.runId,
        employeeId: row.employeeId,
        countryCode: "MY",
        ready: false,
        issues: [
          {
            code: "profile_missing",
            message: "Payroll profile is required before country payroll processing.",
          },
        ],
      })
      continue
    }

    const countryCode = row.countryCode?.trim() || "MY"
    const stub = toHrmPayrollProfileStub({
      countryCode,
      taxIdentifierNumber: row.taxIdentifierNumber,
      epfNumber: row.epfNumber,
      socsoNumber: row.socsoNumber,
      payCurrency: row.payCurrency,
      taxResidencyCountry: row.taxResidencyCountry,
    })

    const assessed = assessCountryPayrollReadiness({
      countryCode,
      profile: stub,
      atDate: periodEnd,
    })

    if (!assessed.ready) {
      notReadyRunCount += 1
    }

    const bucket = byCountry.get(countryCode) ?? { ready: 0, notReady: 0 }
    if (assessed.ready) {
      bucket.ready += 1
    } else {
      bucket.notReady += 1
    }
    byCountry.set(countryCode, bucket)

    runResults.push({
      runId: row.runId,
      employeeId: row.employeeId,
      countryCode,
      ready: assessed.ready,
      issues: assessed.issues,
    })
  }

  return {
    missingProfileCount,
    notReadyRunCount,
    byCountry,
    runs: runResults,
  }
}

/** True when every run with a profile passes country statutory readiness. */
export function isPayrollPeriodCountryReady(
  readiness: PayrollPeriodCountryReadiness
): boolean {
  return readiness.notReadyRunCount === 0 && readiness.missingProfileCount === 0
}
