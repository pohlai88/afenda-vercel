/**
 * Serializable benefit row shapes shared by server queries and client
 * forms (no `server-only` — safe for `"use client"` islands).
 */

export type BenefitPlanRow = {
  id: string
  organizationId: string
  code: string
  name: string
  description: string | null
  benefitKind: string
  benefitCategory: string | null
  benefitType: string | null
  planYear: number | null
  carrierName: string | null
  providerName: string | null
  policyReference: string | null
  providerId: string | null
  scopeCountryCodes: string[] | null
  scopeLegalEntityCodes: string[] | null
  eligibilityRules: Record<string, unknown> | null
  rateTableVersion: string | null
  rateTable: Record<string, unknown> | null
  employerContributionType: string
  employerContributionValue: string | null
  employeeContributionType: string
  employeeContributionValue: string | null
  coverageLevels: string[] | null
  waitingPeriodDays: number
  maxAnnualAmount: string | null
  effectiveFrom: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type BenefitEnrollmentListRow = {
  enrollmentId: string
  organizationId: string
  benefitId: string
  benefitCode: string
  benefitName: string
  employeeId: string
  employeeNumber: string
  employeeLegalName: string
  state: string
  coverageLevel: string | null
  effectiveFrom: Date | null
  effectiveTo: Date | null
  enrolledAt: Date
  terminatedAt: Date | null
}

export type BenefitOpenEnrollmentRow = {
  id: string
  organizationId: string
  name: string
  startsOn: Date
  endsOn: Date
  planIds: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type BenefitLifeEventRow = {
  id: string
  organizationId: string
  employeeId: string
  employeeLegalName: string
  eventType: string
  eventDate: Date
  notes: string | null
  verificationStatus: string
  verifiedByUserId: string | null
  verifiedAt: Date | null
  verificationNote: string | null
  documentIds: string[]
  createdAt: Date
}
