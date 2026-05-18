import { neon } from "@neondatabase/serverless"

import { BOOTSTRAP_FIXTURE } from "../../fixtures/bootstrap-mocks"

export const HRM_PAYROLL_E2E_FIXTURE = {
  employeeId: "00000000-0000-4000-8000-00000000e201",
  contractId: "00000000-0000-4000-8000-00000000e202",
  profileId: "00000000-0000-4000-8000-00000000e203",
  employeeNumber: "E2E-PAY-001",
  employeeLegalName: "Payroll Fixture Employee",
  periodStart: "2026-10-01",
  periodEnd: "2026-10-31",
  cutoffDate: "2026-10-25",
  paymentDate: "2026-11-07",
  payrollGroupCode: "E2E_PAYROLL",
  basicSalaryAmount: "6000.00",
} as const

let sql: ReturnType<typeof neon> | null = null

function getSql() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for HRM payroll E2E fixtures.")
  }
  sql ??= neon(databaseUrl)
  return sql
}

export function hasHrmPayrollFixtureDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export async function resetHrmPayrollE2eFixture(): Promise<void> {
  const db = getSql()
  const orgId = BOOTSTRAP_FIXTURE.organization.id
  const fixture = HRM_PAYROLL_E2E_FIXTURE

  await db`
    DELETE FROM "hrm_payroll_line"
    WHERE "organizationId" = ${orgId}
      AND "runId" IN (
        SELECT id FROM "hrm_payroll_run"
        WHERE "organizationId" = ${orgId}
          AND "employeeId" = ${fixture.employeeId}
      )
  `
  await db`
    DELETE FROM "hrm_payroll_run"
    WHERE "organizationId" = ${orgId}
      AND "employeeId" = ${fixture.employeeId}
  `
  await db`
    DELETE FROM "hrm_approval"
    WHERE "organizationId" = ${orgId}
      AND "subjectKind" = 'payroll_period_lock'
      AND "subjectId" IN (
        SELECT id FROM "hrm_payroll_period"
        WHERE "organizationId" = ${orgId}
          AND "periodStart" = ${fixture.periodStart}
          AND "periodEnd" = ${fixture.periodEnd}
      )
  `
  await db`
    DELETE FROM "hrm_payroll_period"
    WHERE "organizationId" = ${orgId}
      AND "periodStart" = ${fixture.periodStart}
      AND "periodEnd" = ${fixture.periodEnd}
  `
  await db`
    UPDATE "hrm_employee"
    SET "currentEmploymentContractId" = NULL
    WHERE "organizationId" = ${orgId}
      AND id = ${fixture.employeeId}
  `
  await db`
    DELETE FROM "hrm_payroll_profile"
    WHERE "organizationId" = ${orgId}
      AND "employeeId" = ${fixture.employeeId}
  `
  await db`
    DELETE FROM "hrm_employment_contract"
    WHERE "organizationId" = ${orgId}
      AND "employeeId" = ${fixture.employeeId}
  `
  await db`
    DELETE FROM "hrm_employee"
    WHERE "organizationId" = ${orgId}
      AND id = ${fixture.employeeId}
  `
}

export async function seedHrmPayrollE2eFixture(): Promise<void> {
  const db = getSql()
  const orgId = BOOTSTRAP_FIXTURE.organization.id
  const userId = BOOTSTRAP_FIXTURE.members[0].userId
  const fixture = HRM_PAYROLL_E2E_FIXTURE

  await resetHrmPayrollE2eFixture()

  await db`
    INSERT INTO "hrm_employee" (
      "id",
      "organizationId",
      "employeeNumber",
      "legalName",
      "preferredName",
      "countryCode",
      "createdByUserId",
      "updatedByUserId"
    )
    VALUES (
      ${fixture.employeeId},
      ${orgId},
      ${fixture.employeeNumber},
      ${fixture.employeeLegalName},
      'Payroll Fixture',
      'MY',
      ${userId},
      ${userId}
    )
  `

  await db`
    INSERT INTO "hrm_employment_contract" (
      "id",
      "organizationId",
      "employeeId",
      "versionNumber",
      "contractType",
      "state",
      "effectiveFrom",
      "baseSalaryAmount",
      "baseSalaryCurrency",
      "payFrequency",
      "normalWorkingHoursPerWeek",
      "createdByUserId",
      "updatedByUserId"
    )
    VALUES (
      ${fixture.contractId},
      ${orgId},
      ${fixture.employeeId},
      1,
      'full_time',
      'active',
      '2026-01-01',
      ${fixture.basicSalaryAmount},
      'MYR',
      'monthly',
      '40.00',
      ${userId},
      ${userId}
    )
  `

  await db`
    UPDATE "hrm_employee"
    SET "currentEmploymentContractId" = ${fixture.contractId}
    WHERE "organizationId" = ${orgId}
      AND id = ${fixture.employeeId}
  `

  await db`
    INSERT INTO "hrm_payroll_profile" (
      "id",
      "organizationId",
      "employeeId",
      "countryCode",
      "taxResidencyCountry",
      "taxIdentifierType",
      "taxIdentifierNumber",
      "epfNumber",
      "socsoNumber",
      "eisEligible",
      "pcbCategory",
      "hrdfApplicable",
      "paySchedule",
      "payCurrency",
      "payrollGroupCode",
      "effectiveFrom",
      "createdByUserId",
      "updatedByUserId"
    )
    VALUES (
      ${fixture.profileId},
      ${orgId},
      ${fixture.employeeId},
      'MY',
      'MY',
      'TIN',
      'E2E-TIN-001',
      'E2E-EPF-001',
      'E2E-SOCSO-001',
      true,
      'resident',
      false,
      'monthly',
      'MYR',
      ${fixture.payrollGroupCode},
      '2026-01-01',
      ${userId},
      ${userId}
    )
  `
}

export async function readHrmPayrollE2eFixtureState(): Promise<{
  readonly periodState: string | null
  readonly rulePackVersion: string | null
  readonly runStates: readonly string[]
  readonly approvalStates: readonly string[]
}> {
  const db = getSql()
  const orgId = BOOTSTRAP_FIXTURE.organization.id
  const fixture = HRM_PAYROLL_E2E_FIXTURE

  const periods = (await db`
    SELECT "state", "rulePackVersion"
    FROM "hrm_payroll_period"
    WHERE "organizationId" = ${orgId}
      AND "periodStart" = ${fixture.periodStart}
      AND "periodEnd" = ${fixture.periodEnd}
    LIMIT 1
  `) as Array<{
    state: string
    rulePackVersion: string | null
  }>
  const period = periods[0] ?? null
  const runs = (await db`
    SELECT r."state"
    FROM "hrm_payroll_run" r
    INNER JOIN "hrm_payroll_period" p ON p.id = r."periodId"
    WHERE r."organizationId" = ${orgId}
      AND r."employeeId" = ${fixture.employeeId}
      AND p."periodStart" = ${fixture.periodStart}
      AND p."periodEnd" = ${fixture.periodEnd}
    ORDER BY r."createdAt"
  `) as Array<{ state: string }>
  const approvals = (await db`
    SELECT a."state"
    FROM "hrm_approval" a
    INNER JOIN "hrm_payroll_period" p ON p.id = a."subjectId"
    WHERE a."organizationId" = ${orgId}
      AND a."subjectKind" = 'payroll_period_lock'
      AND p."periodStart" = ${fixture.periodStart}
      AND p."periodEnd" = ${fixture.periodEnd}
    ORDER BY a."createdAt"
  `) as Array<{ state: string }>

  return {
    periodState: period?.state ?? null,
    rulePackVersion: period?.rulePackVersion ?? null,
    runStates: runs.map((row) => row.state),
    approvalStates: approvals.map((row) => row.state),
  }
}
