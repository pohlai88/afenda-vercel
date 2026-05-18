export {
  HRM_SALARY_BENCHMARKING_AUDIT,
  type HrmSalaryBenchmarkingAuditAction,
} from "./salary-benchmarking.contract"

export {
  HRM_SALARY_BENCHMARKING_SPEC_MAP,
  listHrmSalaryBenchmarkingSpecCodes,
  type HrmSalaryBenchmarkingSpecArea,
  type HrmSalaryBenchmarkingSpecCode,
} from "./salary-benchmarking-spec-map.shared"

export {
  SALARY_BENCHMARKING_COMPENSATION_SCOPES,
  SALARY_BENCHMARKING_MAPPING_STATES,
  SALARY_BENCHMARKING_MARKET_POSITIONS,
  SALARY_BENCHMARKING_TARGET_PERCENTILES,
  salaryBenchmarkAnalysisInputSchema,
  salaryBenchmarkCompensationScopeSchema,
  salaryBenchmarkEmployeeCompensationSchema,
  salaryBenchmarkMappingSchema,
  salaryBenchmarkMappingStateSchema,
  salaryBenchmarkMarketPositionSchema,
  salaryBenchmarkRowSchema,
  salaryBenchmarkSurveySchema,
  salaryBenchmarkTargetPercentileSchema,
  salaryBenchmarkThresholdsSchema,
  type SalaryBenchmarkAnalysisInput,
  type SalaryBenchmarkAnalysisModel,
  type SalaryBenchmarkCompensationScope,
  type SalaryBenchmarkEmployeeCompensation,
  type SalaryBenchmarkMapping,
  type SalaryBenchmarkMarketPosition,
  type SalaryBenchmarkRow,
  type SalaryBenchmarkSurvey,
  type SalaryBenchmarkTargetPercentile,
  type SalaryBenchmarkThresholds,
} from "./schemas/salary-benchmarking.schema"

export {
  analyzeSalaryBenchmark,
  buildSalaryBenchmarkPayEquityGroups,
  classifySalaryBenchmarkMarketPosition,
  resolveSalaryBenchmarkTargetAmount,
  type SalaryBenchmarkAnalysisFlag,
  type SalaryBenchmarkAnalysisFlagCode,
  type SalaryBenchmarkAnalysisResult,
  type SalaryBenchmarkEquityGroupKey,
  type SalaryBenchmarkPayEquityGroup,
} from "./data/salary-benchmarking-engine.shared"

export {
  formatBenchmarkMoney,
  formatBenchmarkRatio,
  salaryBenchmarkMarketPositionLabel,
} from "./data/salary-benchmarking-display.shared"

export { SalaryBenchmarkingPage } from "./components/salary-benchmarking-page"
