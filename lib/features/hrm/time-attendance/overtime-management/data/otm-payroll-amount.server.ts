import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmploymentContract } from "#lib/db/schema"

/**
 * Derives an hourly rate from the employee's active contract for OT amount (HRM-OTM-021).
 * Uses monthly salary / standard month minutes when period scheduled minutes are unknown.
 */
export async function resolveOtmHourlyRateForEmployee(input: {
  organizationId: string
  employeeId: string
  scheduledMinutesBasis?: number
}): Promise<{ hourlyRate: number; currency: string } | null> {
  const contract = await db.query.hrmEmploymentContract.findFirst({
    where: and(
      eq(hrmEmploymentContract.organizationId, input.organizationId),
      eq(hrmEmploymentContract.employeeId, input.employeeId),
      eq(hrmEmploymentContract.state, "active")
    ),
    orderBy: [desc(hrmEmploymentContract.effectiveFrom)],
    columns: {
      baseSalaryAmount: true,
      baseSalaryCurrency: true,
    },
  })

  if (!contract?.baseSalaryAmount) return null

  const monthlySalary = Number.parseFloat(contract.baseSalaryAmount)
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return null

  const basisMinutes = input.scheduledMinutesBasis ?? 22 * 8 * 60
  if (basisMinutes <= 0) return null

  return {
    hourlyRate: monthlySalary / (basisMinutes / 60),
    currency: contract.baseSalaryCurrency ?? "MYR",
  }
}

export function computeOtmAmountCents(input: {
  payableMinutes: number
  multiplierHundredths: number
  hourlyRate: number
}): number {
  const hours = input.payableMinutes / 60
  const multiplier = input.multiplierHundredths / 100
  const amount = hours * input.hourlyRate * multiplier
  return Math.max(0, Math.round(amount * 100))
}
