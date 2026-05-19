import { describe, expect, it } from "vitest"

import { HRM_BENEFIT_AUDIT } from "#features/hrm"
import {
  HRM_BENEFIT_SPEC_MAP,
  listHrmBenefitSpecCodes,
} from "../../lib/features/hrm/payroll-compensation/benefits-administration/benefit-spec-map.shared"

/**
 * HRM-BEN requirement traceability — documentation-as-test (no runtime IDs in product).
 * Maps enterprise requirement codes to audit contracts and primary unit tests.
 */
const HRM_BEN_COVERAGE = [
  {
    id: "HRM-BEN-001",
    surface: "benefit-plan.actions",
    audit: HRM_BENEFIT_AUDIT.plan.create,
  },
  {
    id: "HRM-BEN-002",
    surface: "benefit-helpers.shared BENEFIT_CATEGORIES",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-003",
    surface: "benefit-eligibility.shared allowedLegalEntityIds",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-004",
    surface: "evaluateBenefitEligibility",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-005",
    surface: "enroll with eligibilityOverride",
    test: "hrm-benefit-enrollment-actions",
  },
  {
    id: "HRM-BEN-006",
    surface: "hrm_benefit_open_enrollment",
    audit: HRM_BENEFIT_AUDIT.open_enrollment.create,
  },
  {
    id: "HRM-BEN-007",
    surface: "resolveBenefitElectionAccess open_enrollment",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-008",
    surface: "employee-portal-benefit.actions",
    audit: HRM_BENEFIT_AUDIT.enrollment.enroll_portal,
  },
  {
    id: "HRM-BEN-009",
    surface: "hrm_benefit_enrollment_dependent",
    test: "hrm-benefit-enrollment-guard",
  },
  {
    id: "HRM-BEN-010",
    surface: "dependent eligibility validation",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-011",
    surface: "BENEFIT_COVERAGE_LEVELS",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-012",
    surface: "enrollment effectiveTo",
    test: "hrm-benefit-enrollment-actions",
  },
  {
    id: "HRM-BEN-013",
    surface: "employerContributionAmount",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-014",
    surface: "employeeContributionAmount",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-015",
    surface: "projectBenefitPayrollLinesForPeriod",
    test: "hrm-payroll-engine",
  },
  {
    id: "HRM-BEN-016",
    surface: "hrm_payroll_line.benefitEnrollmentId",
    test: "hrm-payroll-engine",
  },
  {
    id: "HRM-BEN-017",
    surface: "recurring payroll projection",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-018",
    surface: "changeBenefitEnrollmentAction",
    audit: HRM_BENEFIT_AUDIT.enrollment_change,
  },
  {
    id: "HRM-BEN-019",
    surface: "pending → activate workflow",
    audit: HRM_BENEFIT_AUDIT.enrollment.activate,
  },
  {
    id: "HRM-BEN-020",
    surface: "carrierName providerName on hrm_benefit",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-021",
    surface: "enrollment documentIds",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-022",
    surface: "suspended expired enrollment states",
    audit: HRM_BENEFIT_AUDIT.enrollment.suspend,
  },
  {
    id: "HRM-BEN-023",
    surface: "terminate on employment end",
    audit: HRM_BENEFIT_AUDIT.enrollment.terminate,
  },
  {
    id: "HRM-BEN-024",
    surface: "buildBenefitCensusReport",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-025",
    surface: "benefits reports tab enrollment",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-026",
    surface: "buildBenefitDeductionReconciliationReport",
    test: "hrm-benefits-enterprise",
  },
  {
    id: "HRM-BEN-027",
    surface: "HRM_CAPABILITIES benefits requiredPermission",
    test: "hrm-contract",
  },
  {
    id: "HRM-BEN-028",
    surface: "HRM_BENEFIT_AUDIT",
    audit: HRM_BENEFIT_AUDIT.life_event.record,
  },
] as const

describe("HRM-BEN spec map", () => {
  it("covers all 28 enterprise requirement codes", () => {
    const specCodes = listHrmBenefitSpecCodes()
    for (let index = 1; index <= 28; index += 1) {
      const id = `HRM-BEN-${String(index).padStart(3, "0")}`
      expect(specCodes, `${id} missing from HRM_BENEFIT_SPEC_MAP`).toContain(id)
    }
  })

  it("marks excluded integrations as missing", () => {
    expect(HRM_BENEFIT_SPEC_MAP.carrierEdiIntegration.status).toBe("missing")
    expect(HRM_BENEFIT_SPEC_MAP.medicalClaimsWorkflow.status).toBe("missing")
  })
})

describe("HRM-BEN coverage registry", () => {
  it("lists all 28 enterprise requirement IDs", () => {
    expect(HRM_BEN_COVERAGE).toHaveLength(28)
    const ids = HRM_BEN_COVERAGE.map((row) => row.id)
    expect(new Set(ids).size).toBe(28)
    expect(ids[0]).toBe("HRM-BEN-001")
    expect(ids[27]).toBe("HRM-BEN-028")
  })

  it("exposes frozen plan and enrollment audit strings", () => {
    expect(HRM_BENEFIT_AUDIT.plan.create).toBe("erp.hrm.benefit.create")
    expect(HRM_BENEFIT_AUDIT.enrollment.activate).toBe(
      "erp.hrm.benefit.enrollment.activate"
    )
    expect(HRM_BENEFIT_AUDIT.enrollment.enroll_portal).toBe(
      "erp.hrm.benefit.enrollment.enroll"
    )
  })
})
