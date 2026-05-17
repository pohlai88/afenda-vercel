/**
 * HRM-BEN functional area → implementation status.
 *
 * Status: `shipped` | `partial` | `missing`
 */
export const HRM_BENEFIT_SPEC_MAP = {
  benefitPlanManagement: {
    status: "shipped",
    codes: ["HRM-BEN-001", "HRM-BEN-002", "HRM-BEN-020"],
  },
  benefitCategory: {
    status: "shipped",
    codes: ["HRM-BEN-002"],
  },
  eligibilityRules: {
    status: "shipped",
    codes: ["HRM-BEN-003", "HRM-BEN-004"],
    note: "JSON rules + plan scope country/legal entity",
  },
  enrollmentManagement: {
    status: "shipped",
    codes: [
      "HRM-BEN-005",
      "HRM-BEN-006",
      "HRM-BEN-007",
      "HRM-BEN-008",
      "HRM-BEN-019",
      "HRM-BEN-023",
    ],
  },
  dependentCoverage: {
    status: "shipped",
    codes: ["HRM-BEN-009", "HRM-BEN-010"],
  },
  coverageLevel: {
    status: "shipped",
    codes: ["HRM-BEN-011", "HRM-BEN-022"],
  },
  employerContribution: {
    status: "shipped",
    codes: ["HRM-BEN-013"],
    note: "resolveBenefitEnrollmentContributions + rate table tiers",
  },
  employeeContribution: {
    status: "shipped",
    codes: ["HRM-BEN-014"],
    note: "resolveBenefitEnrollmentContributions + rate table tiers",
  },
  benefitEffectiveDates: {
    status: "shipped",
    codes: ["HRM-BEN-012"],
  },
  benefitChangeManagement: {
    status: "shipped",
    codes: ["HRM-BEN-018"],
    note: "changeBenefitEnrollmentAction + IAM audit diff metadata",
  },
  benefitDeductionIntegration: {
    status: "shipped",
    codes: ["HRM-BEN-015", "HRM-BEN-016", "HRM-BEN-017"],
    note: "payroll-engine projects enrollment amounts",
  },
  benefitProviderReference: {
    status: "shipped",
    codes: ["HRM-BEN-020"],
    note: "hrm_benefit_provider catalog + plan providerId FK",
  },
  benefitDocumentReference: {
    status: "shipped",
    codes: ["HRM-BEN-021"],
    note: "enrollment.documentIds + claim_reference.documentIds",
  },
  benefitClaimsReference: {
    status: "shipped",
    codes: [],
    note: "hrm_benefit_claim_reference — reference rows only, no workflow engine",
  },
  benefitCompliance: {
    status: "shipped",
    codes: ["HRM-BEN-003", "HRM-BEN-004", "HRM-BEN-027", "HRM-BEN-028"],
    note:
      "Eligibility governance + ERP RBAC + IAM audit; statutory ACA/1095 in acaReporting (out of scope)",
  },
  benefitReporting: {
    status: "shipped",
    codes: ["HRM-BEN-024", "HRM-BEN-025", "HRM-BEN-026"],
  },
  benefitAuditTrail: {
    status: "shipped",
    codes: ["HRM-BEN-028"],
    note: "IAM erp.hrm.benefit.* + enriched metadata diffs",
  },
  accessControl: {
    status: "shipped",
    codes: ["HRM-BEN-027"],
  },
  carrierEdiIntegration: {
    status: "missing",
    codes: [],
    note: "Out of scope — external provider systems",
  },
  cobraAdministration: {
    status: "missing",
    codes: [],
  },
  acaReporting: {
    status: "missing",
    codes: [],
  },
  medicalClaimsWorkflow: {
    status: "missing",
    codes: [],
    note: "Owned by expense/claims module per boundary table",
  },
  benefitTaxTreatmentMatrix: {
    status: "missing",
    codes: [],
  },
} as const

export type HrmBenefitSpecArea = keyof typeof HRM_BENEFIT_SPEC_MAP

/** All HRM-BEN codes referenced in the spec map. */
export function listHrmBenefitSpecCodes(): string[] {
  const codes = new Set<string>()
  for (const area of Object.values(HRM_BENEFIT_SPEC_MAP)) {
    for (const code of area.codes) {
      codes.add(code)
    }
  }
  return [...codes].sort()
}
