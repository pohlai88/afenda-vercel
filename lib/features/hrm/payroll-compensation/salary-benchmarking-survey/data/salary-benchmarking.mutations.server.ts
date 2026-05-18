import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmSalaryBenchmarkAnalysisSnapshot,
  hrmSalaryBenchmarkAuditHistory,
  hrmSalaryBenchmarkMapping,
  hrmSalaryBenchmarkRow,
  hrmSalaryBenchmarkSurvey,
} from "#lib/db/schema"

import { HRM_SALARY_BENCHMARKING_AUDIT } from "../salary-benchmarking.contract"
import type {
  SalaryBenchmarkCompensationScope,
  SalaryBenchmarkMapping,
  SalaryBenchmarkRow,
  SalaryBenchmarkSurvey,
  SalaryBenchmarkThresholds,
} from "../schemas/salary-benchmarking.schema"
import { analyzeSalaryBenchmark } from "./salary-benchmarking-engine.shared"
import {
  employeeMatchesMapping,
  listApprovedMappingsWithBenchmarks,
  listEmployeeCompensationForBenchmarking,
} from "./salary-benchmarking.queries.server"

function moneyColumn(value: number | undefined): string | null {
  if (value == null) return null
  return value.toFixed(2)
}

export async function insertSalaryBenchmarkAuditHistory(input: {
  readonly organizationId: string
  readonly action: string
  readonly resourceType: string
  readonly resourceId: string
  readonly actorUserId: string
  readonly snapshotVersion?: string | null
  readonly metadata?: Record<string, unknown>
}) {
  await db.insert(hrmSalaryBenchmarkAuditHistory).values({
    organizationId: input.organizationId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    actorUserId: input.actorUserId,
    snapshotVersion: input.snapshotVersion ?? null,
    metadata: input.metadata ?? {},
  })
}

export async function uploadSalaryBenchmarkSurveyMutation(input: {
  readonly organizationId: string
  readonly actorUserId: string
  readonly survey: Omit<SalaryBenchmarkSurvey, "id">
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmSalaryBenchmarkSurvey).values({
    id,
    organizationId: input.organizationId,
    provider: input.survey.provider,
    surveyYear: input.survey.surveyYear,
    surveyName: input.survey.surveyName ?? null,
    industry: input.survey.industry ?? null,
    companySizeSegment: input.survey.companySizeSegment ?? null,
    revenueSegment: input.survey.revenueSegment ?? null,
    countryCode: input.survey.countryCode,
    location: input.survey.location ?? null,
    currency: input.survey.currency,
    effectiveDate: input.survey.effectiveDate,
    sourceVersion: input.survey.sourceVersion,
    confidenceLevel:
      input.survey.confidenceLevel == null
        ? null
        : String(input.survey.confidenceLevel),
    uploadedByUserId: input.actorUserId,
  })
  await insertSalaryBenchmarkAuditHistory({
    organizationId: input.organizationId,
    action: HRM_SALARY_BENCHMARKING_AUDIT.surveyUploaded,
    resourceType: "salary_benchmark_survey",
    resourceId: id,
    actorUserId: input.actorUserId,
    snapshotVersion: input.survey.sourceVersion,
    metadata: {
      provider: input.survey.provider,
      surveyYear: input.survey.surveyYear,
    },
  })
  return { id }
}

export async function uploadSalaryBenchmarkRowMutation(input: {
  readonly organizationId: string
  readonly actorUserId: string
  readonly row: Omit<SalaryBenchmarkRow, "id">
}): Promise<{ id: string }> {
  const id = crypto.randomUUID()
  await db.insert(hrmSalaryBenchmarkRow).values({
    id,
    organizationId: input.organizationId,
    surveyId: input.row.surveyId,
    benchmarkVersion: input.row.benchmarkVersion,
    jobFamily: input.row.jobFamily,
    benchmarkJobCode: input.row.benchmarkJobCode,
    benchmarkJobTitle: input.row.benchmarkJobTitle,
    benchmarkLevel: input.row.benchmarkLevel,
    industry: input.row.industry ?? null,
    countryCode: input.row.countryCode,
    location: input.row.location ?? null,
    currency: input.row.currency,
    minimum: moneyColumn(input.row.minimum),
    midpoint: moneyColumn(input.row.midpoint),
    median: moneyColumn(input.row.median),
    average: moneyColumn(input.row.average),
    maximum: moneyColumn(input.row.maximum),
    p25: moneyColumn(input.row.p25),
    p50: moneyColumn(input.row.p50),
    p75: moneyColumn(input.row.p75),
    p90: moneyColumn(input.row.p90),
    sampleSize: input.row.sampleSize ?? null,
    effectiveDate: input.row.effectiveDate,
  })
  await insertSalaryBenchmarkAuditHistory({
    organizationId: input.organizationId,
    action: HRM_SALARY_BENCHMARKING_AUDIT.surveyUploaded,
    resourceType: "salary_benchmark_row",
    resourceId: id,
    actorUserId: input.actorUserId,
    snapshotVersion: input.row.benchmarkVersion,
    metadata: {
      surveyId: input.row.surveyId,
      benchmarkJobCode: input.row.benchmarkJobCode,
    },
  })
  return { id }
}

export async function upsertSalaryBenchmarkMappingMutation(input: {
  readonly organizationId: string
  readonly actorUserId: string
  readonly mappingId?: string
  readonly mapping: Omit<
    SalaryBenchmarkMapping,
    "id" | "state" | "approvedByUserId" | "approvedAt"
  >
}): Promise<{ id: string }> {
  const id = input.mappingId ?? crypto.randomUUID()
  if (input.mappingId) {
    await db
      .update(hrmSalaryBenchmarkMapping)
      .set({
        benchmarkId: input.mapping.benchmarkId,
        internalJobId: input.mapping.internalJobId,
        internalJobTitle: input.mapping.internalJobTitle,
        internalJobFamily: input.mapping.internalJobFamily,
        internalGrade: input.mapping.internalGrade,
        legalEntityCode: input.mapping.legalEntityCode ?? null,
        countryCode: input.mapping.countryCode,
        location: input.mapping.location ?? null,
        employmentCategory: input.mapping.employmentCategory ?? null,
        sourceVersion: input.mapping.sourceVersion,
        state: "pending_approval",
        updatedByUserId: input.actorUserId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(hrmSalaryBenchmarkMapping.organizationId, input.organizationId),
          eq(hrmSalaryBenchmarkMapping.id, id)
        )
      )
  } else {
    await db.insert(hrmSalaryBenchmarkMapping).values({
      id,
      organizationId: input.organizationId,
      benchmarkId: input.mapping.benchmarkId,
      internalJobId: input.mapping.internalJobId,
      internalJobTitle: input.mapping.internalJobTitle,
      internalJobFamily: input.mapping.internalJobFamily,
      internalGrade: input.mapping.internalGrade,
      legalEntityCode: input.mapping.legalEntityCode ?? null,
      countryCode: input.mapping.countryCode,
      location: input.mapping.location ?? null,
      employmentCategory: input.mapping.employmentCategory ?? null,
      state: "pending_approval",
      sourceVersion: input.mapping.sourceVersion,
      createdByUserId: input.actorUserId,
      updatedByUserId: input.actorUserId,
    })
  }
  await insertSalaryBenchmarkAuditHistory({
    organizationId: input.organizationId,
    action: HRM_SALARY_BENCHMARKING_AUDIT.benchmarkMapped,
    resourceType: "salary_benchmark_mapping",
    resourceId: id,
    actorUserId: input.actorUserId,
    snapshotVersion: input.mapping.sourceVersion,
    metadata: { benchmarkId: input.mapping.benchmarkId },
  })
  return { id }
}

export async function approveSalaryBenchmarkMappingMutation(input: {
  readonly organizationId: string
  readonly mappingId: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmSalaryBenchmarkMapping)
    .set({
      state: "approved",
      approvedByUserId: input.actorUserId,
      approvedAt: new Date(),
      updatedByUserId: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(hrmSalaryBenchmarkMapping.organizationId, input.organizationId),
        eq(hrmSalaryBenchmarkMapping.id, input.mappingId)
      )
    )
  await insertSalaryBenchmarkAuditHistory({
    organizationId: input.organizationId,
    action: HRM_SALARY_BENCHMARKING_AUDIT.mappingApproved,
    resourceType: "salary_benchmark_mapping",
    resourceId: input.mappingId,
    actorUserId: input.actorUserId,
    metadata: {},
  })
}

export async function generateSalaryBenchmarkAnalysisMutation(input: {
  readonly organizationId: string
  readonly actorUserId: string
  readonly compensationScope: SalaryBenchmarkCompensationScope
  readonly analysisVersion: string
  readonly thresholds: SalaryBenchmarkThresholds
  readonly currencyConversionReference?: string | null
}): Promise<{ snapshotCount: number }> {
  const [mappingPairs, employees] = await Promise.all([
    listApprovedMappingsWithBenchmarks(input.organizationId),
    listEmployeeCompensationForBenchmarking(input.organizationId),
  ])

  let snapshotCount = 0
  for (const { mapping, benchmark } of mappingPairs) {
    const matchedEmployees = employees.filter((employee) =>
      employeeMatchesMapping(employee, mapping)
    )
    for (const employee of matchedEmployees) {
      const result = analyzeSalaryBenchmark({
        benchmark,
        mapping,
        employee,
        compensationScope: input.compensationScope,
        thresholds: input.thresholds,
        currencyConversionReference:
          input.currencyConversionReference ?? undefined,
      })
      const snapshotId = crypto.randomUUID()
      await db
        .insert(hrmSalaryBenchmarkAnalysisSnapshot)
        .values({
          id: snapshotId,
          organizationId: input.organizationId,
          employeeId: employee.employeeId,
          benchmarkId: benchmark.id,
          mappingId: mapping.id,
          analysisVersion: input.analysisVersion,
          compensationScope: input.compensationScope,
          thresholds: input.thresholds,
          result,
          currencyConversionReference:
            input.currencyConversionReference ?? null,
          generatedByUserId: input.actorUserId,
        })
        .onConflictDoUpdate({
          target: [
            hrmSalaryBenchmarkAnalysisSnapshot.organizationId,
            hrmSalaryBenchmarkAnalysisSnapshot.employeeId,
            hrmSalaryBenchmarkAnalysisSnapshot.analysisVersion,
            hrmSalaryBenchmarkAnalysisSnapshot.compensationScope,
          ],
          set: {
            benchmarkId: benchmark.id,
            mappingId: mapping.id,
            thresholds: input.thresholds,
            result,
            currencyConversionReference:
              input.currencyConversionReference ?? null,
            generatedByUserId: input.actorUserId,
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
        })
      snapshotCount += 1
      await insertSalaryBenchmarkAuditHistory({
        organizationId: input.organizationId,
        action: HRM_SALARY_BENCHMARKING_AUDIT.comparisonCalculated,
        resourceType: "salary_benchmark_analysis_snapshot",
        resourceId: `${employee.employeeId}:${input.analysisVersion}:${input.compensationScope}`,
        actorUserId: input.actorUserId,
        snapshotVersion: input.analysisVersion,
        metadata: {
          employeeId: employee.employeeId,
          benchmarkId: benchmark.id,
        },
      })
    }
  }

  return { snapshotCount }
}

export async function handoffSalaryBenchmarkRecommendationMutation(input: {
  readonly organizationId: string
  readonly snapshotId: string
  readonly actorUserId: string
}): Promise<void> {
  await db
    .update(hrmSalaryBenchmarkAnalysisSnapshot)
    .set({
      recommendationHandoffState: "submitted",
      recommendationHandoffAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(
          hrmSalaryBenchmarkAnalysisSnapshot.organizationId,
          input.organizationId
        ),
        eq(hrmSalaryBenchmarkAnalysisSnapshot.id, input.snapshotId)
      )
    )
  await insertSalaryBenchmarkAuditHistory({
    organizationId: input.organizationId,
    action: HRM_SALARY_BENCHMARKING_AUDIT.recommendationGenerated,
    resourceType: "salary_benchmark_analysis_snapshot",
    resourceId: input.snapshotId,
    actorUserId: input.actorUserId,
    metadata: { handoffState: "submitted" },
  })
}
