import type { SalaryBenchmarkAnalysisResult } from "./salary-benchmarking-engine.shared"
import type {
  SalaryBenchmarkEmployeeCompensation,
  SalaryBenchmarkMapping,
  SalaryBenchmarkRow,
  SalaryBenchmarkSurvey,
  SalaryBenchmarkThresholds,
} from "../schemas/salary-benchmarking.schema"

function parseMoney(value: string | null | undefined): number | undefined {
  if (value == null || value === "") return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseOptionalDate(value: Date | null | undefined): string | undefined {
  if (!value) return undefined
  return value.toISOString().slice(0, 10)
}

function formatDateColumn(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10)
  }
  return value
}

export function mapSalaryBenchmarkSurveyRow(row: {
  id: string
  provider: string
  surveyYear: number
  surveyName: string | null
  industry: string | null
  companySizeSegment: string | null
  revenueSegment: string | null
  countryCode: string
  location: string | null
  currency: string
  effectiveDate: string | Date
  sourceVersion: string
  confidenceLevel: string | null
}): SalaryBenchmarkSurvey {
  return {
    id: row.id,
    provider: row.provider,
    surveyYear: row.surveyYear,
    surveyName: row.surveyName,
    industry: row.industry,
    companySizeSegment: row.companySizeSegment,
    revenueSegment: row.revenueSegment,
    countryCode: row.countryCode,
    location: row.location,
    currency: row.currency,
    effectiveDate: formatDateColumn(row.effectiveDate),
    sourceVersion: row.sourceVersion,
    confidenceLevel: parseMoney(row.confidenceLevel),
  }
}

export function mapSalaryBenchmarkRowRecord(row: {
  id: string
  surveyId: string
  benchmarkVersion: string
  jobFamily: string
  benchmarkJobCode: string
  benchmarkJobTitle: string
  benchmarkLevel: string
  industry: string | null
  countryCode: string
  location: string | null
  currency: string
  minimum: string | null
  midpoint: string | null
  median: string | null
  average: string | null
  maximum: string | null
  p25: string | null
  p50: string | null
  p75: string | null
  p90: string | null
  sampleSize: number | null
  effectiveDate: string | Date
}): SalaryBenchmarkRow {
  return {
    id: row.id,
    surveyId: row.surveyId,
    benchmarkVersion: row.benchmarkVersion,
    jobFamily: row.jobFamily,
    benchmarkJobCode: row.benchmarkJobCode,
    benchmarkJobTitle: row.benchmarkJobTitle,
    benchmarkLevel: row.benchmarkLevel,
    industry: row.industry,
    countryCode: row.countryCode,
    location: row.location,
    currency: row.currency,
    minimum: parseMoney(row.minimum),
    midpoint: parseMoney(row.midpoint),
    median: parseMoney(row.median),
    average: parseMoney(row.average),
    maximum: parseMoney(row.maximum),
    p25: parseMoney(row.p25),
    p50: parseMoney(row.p50),
    p75: parseMoney(row.p75),
    p90: parseMoney(row.p90),
    sampleSize: row.sampleSize ?? undefined,
    effectiveDate: formatDateColumn(row.effectiveDate),
  }
}

export function mapSalaryBenchmarkMappingRow(row: {
  id: string
  benchmarkId: string
  internalJobId: string
  internalJobTitle: string
  internalJobFamily: string
  internalGrade: string
  legalEntityCode: string | null
  countryCode: string
  location: string | null
  employmentCategory: string | null
  state: string
  approvedByUserId: string | null
  approvedAt: Date | null
  sourceVersion: string
}): SalaryBenchmarkMapping {
  return {
    id: row.id,
    benchmarkId: row.benchmarkId,
    internalJobId: row.internalJobId,
    internalJobTitle: row.internalJobTitle,
    internalJobFamily: row.internalJobFamily,
    internalGrade: row.internalGrade,
    legalEntityCode: row.legalEntityCode,
    countryCode: row.countryCode,
    location: row.location,
    employmentCategory: row.employmentCategory,
    state: row.state as SalaryBenchmarkMapping["state"],
    approvedByUserId: row.approvedByUserId,
    approvedAt: parseOptionalDate(row.approvedAt),
    sourceVersion: row.sourceVersion,
  }
}

export function mapSalaryBenchmarkAnalysisResult(
  value: Record<string, unknown>
): SalaryBenchmarkAnalysisResult {
  return value as SalaryBenchmarkAnalysisResult
}

export function mapSalaryBenchmarkThresholds(
  value: Record<string, unknown>
): SalaryBenchmarkThresholds {
  return value as SalaryBenchmarkThresholds
}

export function mapEmployeeCompensationRow(row: {
  id: string
  employeeId: string
  employeeNumber: string
  employeeName: string
  department: string | null
  managerName: string | null
  legalEntityCode: string | null
  countryCode: string
  location: string | null
  jobFamily: string
  jobTitle: string
  grade: string
  employmentCategory: string | null
  tenureMonths: number | null
  performanceRating: string | null
  baseSalary: string
  totalCash: string | null
  totalCompensation: string | null
  currency: string
  internalRangeMidpoint: string | null
}): SalaryBenchmarkEmployeeCompensation {
  const baseSalary = parseMoney(row.baseSalary)
  if (baseSalary == null) {
    throw new Error("Employee base salary is required for benchmarking.")
  }
  return {
    id: row.id,
    employeeId: row.employeeId,
    employeeNumber: row.employeeNumber,
    employeeName: row.employeeName,
    department: row.department,
    managerName: row.managerName,
    legalEntityCode: row.legalEntityCode,
    countryCode: row.countryCode,
    location: row.location,
    jobFamily: row.jobFamily,
    jobTitle: row.jobTitle,
    grade: row.grade,
    employmentCategory: row.employmentCategory,
    tenureMonths: row.tenureMonths ?? undefined,
    performanceRating: row.performanceRating,
    baseSalary,
    totalCash: parseMoney(row.totalCash),
    totalCompensation: parseMoney(row.totalCompensation),
    currency: row.currency,
    internalRangeMidpoint: parseMoney(row.internalRangeMidpoint),
  }
}
