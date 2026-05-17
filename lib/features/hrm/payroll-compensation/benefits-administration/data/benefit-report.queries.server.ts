import "server-only"

export async function countBenefitPayrollLinesByEnrollmentForPeriod(_params: {
  readonly organizationId: string
  readonly periodStart: Date
  readonly periodEnd: Date
}): Promise<Map<string, number>> {
  return new Map<string, number>()
}
