export const HRM_SALARY_BENCHMARKING_SPEC_MAP = {
  "HRM-SBS-001": "external-survey-data",
  "HRM-SBS-002": "survey-provider-dimensions",
  "HRM-SBS-003": "benchmark-salary-values",
  "HRM-SBS-004": "market-percentiles",
  "HRM-SBS-005": "internal-job-mapping",
  "HRM-SBS-006": "grade-level-mapping",
  "HRM-SBS-007": "mapping-dimensions",
  "HRM-SBS-008": "mapping-approval",
  "HRM-SBS-009": "base-salary-comparison",
  "HRM-SBS-010": "total-cash-comparison",
  "HRM-SBS-011": "total-compensation-comparison",
  "HRM-SBS-012": "compa-ratio",
  "HRM-SBS-013": "market-ratio",
  "HRM-SBS-014": "market-position-classification",
  "HRM-SBS-015": "below-target-flags",
  "HRM-SBS-016": "above-range-flags",
  "HRM-SBS-017": "internal-pay-gap",
  "HRM-SBS-018": "pay-equity-analysis",
  "HRM-SBS-019": "salary-range-review",
  "HRM-SBS-020": "salary-band-adjustment-indicators",
  "HRM-SBS-021": "market-adjustment-recommendations",
  "HRM-SBS-022": "benchmark-versioning",
  "HRM-SBS-023": "analysis-version-preservation",
  "HRM-SBS-024": "currency-conversion-reference",
  "HRM-SBS-025": "restricted-access",
  "HRM-SBS-026": "benchmarking-reports",
  "HRM-SBS-027": "pay-equity-reports",
  "HRM-SBS-028": "audit-trail",
} as const

export type HrmSalaryBenchmarkingSpecCode =
  keyof typeof HRM_SALARY_BENCHMARKING_SPEC_MAP

export type HrmSalaryBenchmarkingSpecArea =
  (typeof HRM_SALARY_BENCHMARKING_SPEC_MAP)[HrmSalaryBenchmarkingSpecCode]

export function listHrmSalaryBenchmarkingSpecCodes(): readonly HrmSalaryBenchmarkingSpecCode[] {
  return Object.keys(
    HRM_SALARY_BENCHMARKING_SPEC_MAP
  ) as HrmSalaryBenchmarkingSpecCode[]
}
