import "server-only"

export {
  listCompensationComponentsForOrg,
  buildCompensationSnapshotForContract,
  listContractAllowancesForEngine,
  listCompensationLineSummariesForContracts,
  parseStoredAnnexSlots,
  parseStoredCompensationSnapshot,
} from "./data/compensation.queries.server"

export {
  ensureDefaultHrmCompensationComponents,
  insertContractCompensationLines,
  copyContractCompensationLines,
} from "./data/compensation.mutations.server"

export type {
  HrmCompensationComponentRow,
  ContractCompensationLineSummary,
  HrmCompensationQueryClient,
} from "./data/compensation.queries.server"

export type {
  HrmCompensationDbClient,
  ContractCompensationLineInput,
} from "./data/compensation.mutations.server"

export {
  parseAllowanceLineInputsFromForm,
  tryBuildAnnexSlotsFromForm,
} from "./schemas/contract-compensation.shared"

export {
  deriveCompensationRecommendationModel,
  evaluateCompensationEligibility,
  hrmCompensationBudgetPoolScopeSchema,
  hrmCompensationEligibilityEmployeeSchema,
  hrmCompensationEligibilityRulesSchema,
  hrmCompensationRecommendationModelInputSchema,
  hrmCompensationSalaryStructureReferenceSchema,
} from "./schemas/compensation-planning.shared"

export type {
  HrmCompensationEligibilityResult,
  HrmCompensationRecommendationModel,
  HrmCompensationRecommendationModelInput,
} from "./schemas/compensation-planning.shared"

export { resolveCompensationPlanningSurfaceAccess } from "./data/cpm-access.server"
export type { CompensationPlanningSurfaceAccess } from "./data/cpm-access.server"
export {
  loadCompensationPlanningPageData,
  listCompensationCyclesForOrg,
  syncCompensationCycleParticipants,
} from "./data/cpm.queries.server"
export type {
  CompensationCycleRow,
  CompensationBudgetPoolRow,
  CompensationParticipantRow,
} from "./data/cpm.queries.server"
