export {
  HRM_COMPENSATION_COMPONENT_CODES,
  HRM_ALLOWANCE_AMOUNT_DECIMAL_RE,
  hrmCompensationSnapshotEntrySchema,
  hrmCompensationSnapshotSchema,
  hrmContractAnnexSlotsSchema,
  parseAllowanceLineInputsFromForm,
  tryBuildAnnexSlotsFromForm,
} from "./schemas/contract-compensation.shared"

export type {
  HrmCompensationComponentCode,
  HrmCompensationSnapshotEntry,
  HrmContractAnnexSlot,
  HrmAllowanceLineFormParsed,
} from "./schemas/contract-compensation.shared"

export {
  HRM_COMPENSATION_ADJUSTMENT_TYPES,
  HRM_COMPENSATION_BUDGET_SCOPE_TYPES,
  HRM_COMPENSATION_CYCLE_TYPES,
  HRM_COMPENSATION_RECOMMENDATION_STATES,
  deriveCompensationRecommendationModel,
  evaluateCompensationEligibility,
  hrmCompensationAdjustmentTypeSchema,
  hrmCompensationBudgetPoolScopeSchema,
  hrmCompensationBudgetScopeTypeSchema,
  hrmCompensationCycleTypeSchema,
  hrmCompensationEligibilityEmployeeSchema,
  hrmCompensationEligibilityRulesSchema,
  hrmCompensationRecommendationModelInputSchema,
  hrmCompensationRecommendationStateSchema,
  hrmCompensationSalaryStructureReferenceSchema,
} from "./schemas/compensation-planning.shared"

export type {
  HrmCompensationAdjustmentType,
  HrmCompensationBandPosition,
  HrmCompensationBudgetPoolScope,
  HrmCompensationBudgetScopeType,
  HrmCompensationCycleType,
  HrmCompensationEligibilityEmployee,
  HrmCompensationEligibilityReason,
  HrmCompensationEligibilityReasonCode,
  HrmCompensationEligibilityResult,
  HrmCompensationEligibilityRules,
  HrmCompensationRecommendationModel,
  HrmCompensationRecommendationModelInput,
  HrmCompensationRecommendationState,
  HrmCompensationSalaryStructureReference,
} from "./schemas/compensation-planning.shared"

export { HRM_COMPENSATION_PLANNING_AUDIT } from "./compensation-planning.contract"
export {
  HRM_COMPENSATION_PLANNING_SPEC_MAP,
  listHrmCompensationPlanningSpecCodes,
} from "./compensation-planning-spec-map.shared"
export type { HrmCompensationPlanningSpecArea } from "./compensation-planning-spec-map.shared"

export { CompensationPlanningPage } from "./components/compensation-planning-page"
export { resolveCompensationPlanningSurfaceAccess } from "./data/cpm-access.server"
export type { CompensationPlanningSurfaceAccess } from "./data/cpm-access.server"
