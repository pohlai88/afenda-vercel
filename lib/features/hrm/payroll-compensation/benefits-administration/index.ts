export { buildBenefitPlanEnterpriseVersion } from "./data/benefit-plan-version.shared"
export type { BenefitPlanEnterpriseVersion } from "./data/benefit-plan-version.shared"

export {
  buildBenefitCensusReportForOrganization,
  evaluateBenefitEligibilityForEmployee,
  getBenefitPlanEnterpriseVersionForOrganization,
  listBenefitPayrollProjectionEnrollmentsForPeriod,
  listBenefitPlanEnterpriseVersionsForOrganization,
  projectBenefitPayrollLinesForEmployeePeriod,
} from "./data/benefit-enterprise.queries.server"

export type {
  BenefitEligibilityEvaluation,
  BenefitPayrollProjectionQueryOptions,
  BuildBenefitCensusReportForOrganizationOptions,
  EvaluateBenefitEligibilityForEmployeeOptions,
  ListBenefitPlanEnterpriseVersionsForOrganizationOptions,
} from "./data/benefit-enterprise.queries.server"

export {
  evaluateBenefitEligibility,
  parseBenefitEligibilityRules,
  summarizeBenefitEligibilityFailure,
} from "./data/benefit-eligibility.shared"

export type {
  BenefitEligibilityEmployee,
  BenefitEligibilityPlan,
  BenefitEligibilityReason,
  BenefitEligibilityReasonCode,
  BenefitEligibilityResult,
  BenefitEligibilityRules,
  EvaluateBenefitEligibilityInput,
} from "./data/benefit-eligibility.shared"

export {
  buildLifeEventEnrollmentWindow,
  isBenefitEnrollmentWindowOpen,
  resolveBenefitElectionAccess,
} from "./data/benefit-self-service.shared"

export type {
  BenefitElectionAccessReason,
  BenefitElectionAccessReasonCode,
  BenefitElectionAccessResult,
  BenefitEnrollmentWindow,
  BenefitEnrollmentWindowKind,
} from "./data/benefit-self-service.shared"

export {
  projectBenefitPayrollLines,
  projectBenefitPayrollLinesForPeriod,
} from "./data/benefit-payroll-projection.shared"

export type {
  BenefitPayrollProjectedLine,
  BenefitPayrollProjectionEnrollment,
} from "./data/benefit-payroll-projection.shared"

export { buildBenefitCensusReport } from "./data/benefit-reporting.shared"
export type { BenefitCensusReport } from "./data/benefit-reporting.shared"

export { HRM_BENEFIT_AUDIT } from "./benefit.contract"
export {
  HRM_BENEFIT_SPEC_MAP,
  listHrmBenefitSpecCodes,
} from "./benefit-spec-map.shared"
export type { HrmBenefitSpecArea } from "./benefit-spec-map.shared"

export {
  resolveBenefitEnrollmentContributions,
} from "./data/benefit-contribution.shared"

export type {
  ResolvedBenefitEnrollmentContributions,
  BenefitContributionResolutionSource,
} from "./data/benefit-contribution.shared"

export { parseBenefitRateTable } from "./schema/benefit-rate-table.schema"
export type { BenefitRateTable } from "./schema/benefit-rate-table.schema"

export { BenefitsPage } from "./components/benefits-page"
