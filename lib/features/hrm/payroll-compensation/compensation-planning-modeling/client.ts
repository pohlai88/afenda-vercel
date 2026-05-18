export {
  HRM_COMPENSATION_COMPONENT_CODES,
  HRM_ALLOWANCE_AMOUNT_DECIMAL_RE,
  hrmCompensationSnapshotEntrySchema,
  hrmCompensationSnapshotSchema,
  hrmContractAnnexSlotsSchema,
  parseAllowanceLineInputsFromForm,
  tryBuildAnnexSlotsFromForm,
} from "./schema/contract-compensation.shared"

export type {
  HrmCompensationComponentCode,
  HrmCompensationSnapshotEntry,
  HrmContractAnnexSlot,
  HrmAllowanceLineFormParsed,
} from "./schema/contract-compensation.shared"

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
} from "./schema/compensation-planning.shared"

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
} from "./schema/compensation-planning.shared"
