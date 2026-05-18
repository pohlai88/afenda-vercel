export type BonusFormulaType =
  | "fixed_amount"
  | "salary_percentage"
  | "sales_percentage"
  | "revenue_percentage"
  | "margin_percentage"
  | "kpi_score"
  | "performance_rating"
  | "tiered_commission"

export type BonusPlanType =
  | "annual_bonus"
  | "performance_bonus"
  | "discretionary_bonus"
  | "contractual_bonus"
  | "sales_commission"
  | "project_incentive"
  | "productivity_incentive"
  | "retention_incentive"
  | "referral_incentive"
  | "recognition_payment"

export type BonusPayoutState =
  | "draft"
  | "calculated"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "returned"
  | "locked"
  | "exported_to_payroll"
  | "paid"
  | "void"

export type BonusEligibilityRules = {
  readonly legalEntityCodes?: readonly string[]
  readonly departmentIds?: readonly string[]
  readonly gradeIds?: readonly string[]
  readonly jobRoleIds?: readonly string[]
  readonly employmentTypes?: readonly string[]
  readonly employeeStatuses?: readonly string[]
  readonly minTenureMonths?: number
  readonly performanceRatings?: readonly string[]
  readonly salesTeamCodes?: readonly string[]
}

export type BonusEligibilityEmployee = {
  readonly employeeId: string
  readonly legalEntityCode?: string | null
  readonly departmentId?: string | null
  readonly gradeId?: string | null
  readonly jobRoleId?: string | null
  readonly employmentType?: string | null
  readonly employeeStatus?: string | null
  readonly tenureMonths?: number | null
  readonly performanceRating?: string | null
  readonly salesTeamCode?: string | null
}

export type BonusEligibilityResult = {
  readonly eligible: boolean
  readonly reasons: readonly string[]
}

export type BonusFormulaTier = {
  readonly upToPercent?: number
  readonly rate: number
}

export type BonusFormulaConfig = {
  readonly fixedAmount?: number
  readonly salaryPercent?: number
  readonly salesPercent?: number
  readonly revenuePercent?: number
  readonly marginPercent?: number
  readonly ratingAmountMap?: Record<string, number>
  readonly tiers?: readonly BonusFormulaTier[]
  readonly acceleratorRate?: number
}

export type BonusCalculationInput = {
  readonly formulaType: BonusFormulaType
  readonly formulaConfig?: BonusFormulaConfig
  readonly baseSalaryAmount?: number
  readonly targetAmount?: number
  readonly actualAmount?: number
  readonly kpiScorePercent?: number
  readonly performanceRating?: string | null
  readonly capAmount?: number | null
  readonly floorAmount?: number | null
  readonly guaranteedAmount?: number | null
  readonly prorationFactor?: number
  readonly companyMultiplier?: number
  readonly departmentMultiplier?: number
  readonly teamMultiplier?: number
  readonly individualMultiplier?: number
}

export type BonusCalculationFlag = {
  readonly code: string
  readonly message: string
}

export type BonusCalculationResult = {
  readonly targetAmount: string
  readonly achievementPercent: string
  readonly calculatedAmount: string
  readonly prorationFactor: string
  readonly flags: readonly BonusCalculationFlag[]
  readonly snapshot: Record<string, unknown>
}

export type BonusPayrollProjectionInput = {
  readonly payoutId: string
  readonly payrollLineCode: string
  readonly description: string
  readonly amount: string
  readonly currency: string
}
