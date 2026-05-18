export const HRM_SALARY_BENCHMARKING_AUDIT = {
  surveyUploaded: "erp.hrm.salary_benchmarking.survey.uploaded",
  benchmarkMapped: "erp.hrm.salary_benchmarking.mapping.changed",
  mappingApproved: "erp.hrm.salary_benchmarking.mapping.approved",
  comparisonCalculated: "erp.hrm.salary_benchmarking.comparison.calculated",
  payGapReviewed: "erp.hrm.salary_benchmarking.pay_gap.reviewed",
  recommendationGenerated:
    "erp.hrm.salary_benchmarking.recommendation.generated",
} as const

export type HrmSalaryBenchmarkingAuditAction =
  (typeof HRM_SALARY_BENCHMARKING_AUDIT)[keyof typeof HRM_SALARY_BENCHMARKING_AUDIT]
