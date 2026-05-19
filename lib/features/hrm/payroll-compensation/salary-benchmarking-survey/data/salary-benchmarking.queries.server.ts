import "server-only"

import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmDepartment,
  hrmEmployee,
  hrmEmploymentContract,
  hrmJobGrade,
  hrmPosition,
  hrmSalaryBenchmarkAnalysisSnapshot,
  hrmSalaryBenchmarkMapping,
  hrmSalaryBenchmarkRow,
  hrmSalaryBenchmarkSurvey,
} from "#lib/db/schema"

import type { SalaryBenchmarkAnalysisResult } from "./salary-benchmarking-engine.shared"
import {
  mapEmployeeCompensationRow,
  mapSalaryBenchmarkAnalysisResult,
  mapSalaryBenchmarkMappingRow,
  mapSalaryBenchmarkRowRecord,
  mapSalaryBenchmarkSurveyRow,
  mapSalaryBenchmarkThresholds,
} from "./salary-benchmarking.mappers.shared"
import type {
  SalaryBenchmarkMapping,
  SalaryBenchmarkRow,
  SalaryBenchmarkSurvey,
} from "../schemas/salary-benchmarking.schema"

export async function listSalaryBenchmarkSurveysForOrganization(
  organizationId: string
): Promise<readonly SalaryBenchmarkSurvey[]> {
  const rows = await db
    .select()
    .from(hrmSalaryBenchmarkSurvey)
    .where(eq(hrmSalaryBenchmarkSurvey.organizationId, organizationId))
    .orderBy(
      desc(hrmSalaryBenchmarkSurvey.surveyYear),
      desc(hrmSalaryBenchmarkSurvey.createdAt)
    )
  return rows.map((row) =>
    mapSalaryBenchmarkSurveyRow({
      ...row,
      effectiveDate: row.effectiveDate,
    })
  )
}

export async function listSalaryBenchmarkRowsForOrganization(
  organizationId: string
): Promise<readonly SalaryBenchmarkRow[]> {
  const rows = await db
    .select()
    .from(hrmSalaryBenchmarkRow)
    .where(eq(hrmSalaryBenchmarkRow.organizationId, organizationId))
    .orderBy(desc(hrmSalaryBenchmarkRow.effectiveDate))
  return rows.map((row) =>
    mapSalaryBenchmarkRowRecord({
      ...row,
      effectiveDate: row.effectiveDate,
    })
  )
}

export async function listSalaryBenchmarkMappingsForOrganization(
  organizationId: string
): Promise<readonly SalaryBenchmarkMapping[]> {
  const rows = await db
    .select()
    .from(hrmSalaryBenchmarkMapping)
    .where(eq(hrmSalaryBenchmarkMapping.organizationId, organizationId))
    .orderBy(desc(hrmSalaryBenchmarkMapping.updatedAt))
  return rows.map(mapSalaryBenchmarkMappingRow)
}

export async function listSalaryBenchmarkAnalysisForOrganization(
  organizationId: string
): Promise<readonly SalaryBenchmarkAnalysisResult[]> {
  const rows = await db
    .select()
    .from(hrmSalaryBenchmarkAnalysisSnapshot)
    .where(
      eq(hrmSalaryBenchmarkAnalysisSnapshot.organizationId, organizationId)
    )
    .orderBy(desc(hrmSalaryBenchmarkAnalysisSnapshot.generatedAt))
  return rows.map((row) => mapSalaryBenchmarkAnalysisResult(row.result))
}

export async function listEmployeeCompensationForBenchmarking(
  organizationId: string
) {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeId: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      employeeName: hrmEmployee.legalName,
      department: hrmDepartment.name,
      managerName: sql<string | null>`null`,
      legalEntityCode: sql<string | null>`null`,
      countryCode: sql<string>`coalesce(${hrmEmployee.countryCode}, ${hrmEmploymentContract.baseSalaryCurrency})`,
      location: sql<
        string | null
      >`coalesce(${hrmPosition.workLocationCode}, ${hrmDepartment.workLocationCode})`,
      jobFamily: sql<string>`coalesce(${hrmPosition.title}, 'Unassigned')`,
      jobTitle: sql<string>`coalesce(${hrmPosition.title}, 'Unassigned')`,
      grade: sql<string>`coalesce(${hrmJobGrade.code}, 'Unassigned')`,
      employmentCategory: hrmEmployee.employmentType,
      tenureMonths: sql<number | null>`null`,
      performanceRating: sql<string | null>`null`,
      baseSalary: hrmEmploymentContract.baseSalaryAmount,
      totalCash: sql<string | null>`null`,
      totalCompensation: sql<string | null>`null`,
      currency: hrmEmploymentContract.baseSalaryCurrency,
      internalRangeMidpoint: sql<
        string | null
      >`case when ${hrmJobGrade.minSalaryAmount} is not null and ${hrmJobGrade.maxSalaryAmount} is not null then ((${hrmJobGrade.minSalaryAmount})::numeric + (${hrmJobGrade.maxSalaryAmount})::numeric) / 2 else null end`,
      currentPositionId: hrmEmployee.currentPositionId,
    })
    .from(hrmEmployee)
    .innerJoin(
      hrmEmploymentContract,
      and(
        eq(hrmEmploymentContract.organizationId, organizationId),
        eq(hrmEmploymentContract.employeeId, hrmEmployee.id),
        eq(hrmEmploymentContract.state, "active")
      )
    )
    .leftJoin(hrmPosition, eq(hrmPosition.id, hrmEmployee.currentPositionId))
    .leftJoin(hrmJobGrade, eq(hrmJobGrade.id, hrmEmployee.currentJobGradeId))
    .leftJoin(
      hrmDepartment,
      eq(hrmDepartment.id, hrmEmployee.currentDepartmentId)
    )
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )

  return rows
    .filter((row) => row.baseSalary != null)
    .map((row) =>
      mapEmployeeCompensationRow({
        id: row.id,
        employeeId: row.employeeId,
        employeeNumber: row.employeeNumber,
        employeeName: row.employeeName,
        department: row.department,
        managerName: row.managerName,
        legalEntityCode: row.legalEntityCode,
        countryCode: row.countryCode ?? "MY",
        location: row.location,
        jobFamily: row.jobFamily ?? "Unassigned",
        jobTitle: row.jobTitle ?? "Unassigned",
        grade: row.grade ?? "Unassigned",
        employmentCategory: row.employmentCategory,
        tenureMonths: row.tenureMonths,
        performanceRating: row.performanceRating,
        baseSalary: row.baseSalary!,
        totalCash: row.totalCash,
        totalCompensation: row.totalCompensation,
        currency: row.currency,
        internalRangeMidpoint: row.internalRangeMidpoint,
      })
    )
}

export async function getSalaryBenchmarkRowForOrganization(input: {
  readonly organizationId: string
  readonly benchmarkId: string
}): Promise<SalaryBenchmarkRow | null> {
  const [row] = await db
    .select()
    .from(hrmSalaryBenchmarkRow)
    .where(
      and(
        eq(hrmSalaryBenchmarkRow.organizationId, input.organizationId),
        eq(hrmSalaryBenchmarkRow.id, input.benchmarkId)
      )
    )
    .limit(1)
  if (!row) return null
  return mapSalaryBenchmarkRowRecord({
    ...row,
    effectiveDate: row.effectiveDate,
  })
}

export async function listApprovedMappingsWithBenchmarks(
  organizationId: string
): Promise<
  readonly {
    mapping: SalaryBenchmarkMapping
    benchmark: SalaryBenchmarkRow
  }[]
> {
  const rows = await db
    .select({
      mapping: hrmSalaryBenchmarkMapping,
      benchmark: hrmSalaryBenchmarkRow,
    })
    .from(hrmSalaryBenchmarkMapping)
    .innerJoin(
      hrmSalaryBenchmarkRow,
      eq(hrmSalaryBenchmarkRow.id, hrmSalaryBenchmarkMapping.benchmarkId)
    )
    .where(
      and(
        eq(hrmSalaryBenchmarkMapping.organizationId, organizationId),
        eq(hrmSalaryBenchmarkMapping.state, "approved")
      )
    )

  return rows.map(({ mapping, benchmark }) => ({
    mapping: mapSalaryBenchmarkMappingRow(mapping),
    benchmark: mapSalaryBenchmarkRowRecord({
      ...benchmark,
      effectiveDate: benchmark.effectiveDate,
    }),
  }))
}

export async function resolveLatestAnalysisVersion(
  organizationId: string
): Promise<string | null> {
  const [row] = await db
    .select({
      analysisVersion: hrmSalaryBenchmarkAnalysisSnapshot.analysisVersion,
    })
    .from(hrmSalaryBenchmarkAnalysisSnapshot)
    .where(
      eq(hrmSalaryBenchmarkAnalysisSnapshot.organizationId, organizationId)
    )
    .orderBy(desc(hrmSalaryBenchmarkAnalysisSnapshot.generatedAt))
    .limit(1)
  return row?.analysisVersion ?? null
}

export async function getSalaryBenchmarkSnapshotById(input: {
  readonly organizationId: string
  readonly snapshotId: string
}) {
  const [row] = await db
    .select()
    .from(hrmSalaryBenchmarkAnalysisSnapshot)
    .where(
      and(
        eq(
          hrmSalaryBenchmarkAnalysisSnapshot.organizationId,
          input.organizationId
        ),
        eq(hrmSalaryBenchmarkAnalysisSnapshot.id, input.snapshotId)
      )
    )
    .limit(1)
  if (!row) return null
  return {
    ...row,
    result: mapSalaryBenchmarkAnalysisResult(row.result),
    thresholds: mapSalaryBenchmarkThresholds(row.thresholds),
  }
}

export function employeeMatchesMapping(
  employee: {
    readonly employeeId: string
    readonly jobTitle: string
    readonly grade: string
  },
  mapping: SalaryBenchmarkMapping
): boolean {
  return (
    employee.employeeId === mapping.internalJobId ||
    employee.jobTitle === mapping.internalJobTitle ||
    employee.grade === mapping.internalGrade
  )
}
