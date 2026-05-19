import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const PAYROLL_ROOT = join(
  process.cwd(),
  "lib/features/hrm/payroll-compensation/payroll-processing"
)

describe("HRM payroll processing contracts", () => {
  it("uses ERP RBAC payroll mutation gates instead of org admin role", () => {
    const periodActions = readFileSync(
      join(PAYROLL_ROOT, "actions", "payroll-period.actions.ts"),
      "utf8"
    )
    const profileActions = readFileSync(
      join(PAYROLL_ROOT, "actions", "payroll-profile.actions.ts"),
      "utf8"
    )

    expect(periodActions).toContain("requirePayrollSessionMutationGate")
    expect(periodActions).toContain("HRM_PAYROLL_PROCESSING_AUDIT")
    expect(periodActions).not.toContain("canActInOrganization")
    expect(periodActions).not.toContain("requireHrmAdmin")
    expect(profileActions).toContain("requirePayrollMutationGate")
    expect(profileActions).not.toContain("canActInOrganization")
  })

  it("centralizes payroll action guards in payroll-action-guard.server.ts", () => {
    const guard = readFileSync(
      join(PAYROLL_ROOT, "data", "payroll-action-guard.server.ts"),
      "utf8"
    )

    expect(guard).toContain('object: "payroll"')
    expect(guard).toContain("requirePayrollMutationGate")
    expect(guard).toContain("requirePayrollSessionMutationGate")
  })

  it("imports benefit payroll projection from benefits-administration", () => {
    const engine = readFileSync(
      join(PAYROLL_ROOT, "data", "payroll-engine.server.ts"),
      "utf8"
    )
    const queries = readFileSync(
      join(PAYROLL_ROOT, "data", "payroll.queries.server.ts"),
      "utf8"
    )

    expect(engine).toContain(
      "../../benefits-administration/data/benefit-payroll-projection.shared"
    )
    expect(engine).not.toContain("../../../data/benefit-payroll-projection")
    expect(queries).toContain(
      "../../benefits-administration/data/benefit-enterprise.queries.server"
    )
    expect(queries).not.toContain("../../../data/benefit-enterprise")
  })

  it("snapshots contract compensation through the compensation planning module", () => {
    const periodActions = readFileSync(
      join(PAYROLL_ROOT, "actions", "payroll-period.actions.ts"),
      "utf8"
    )
    const mutations = readFileSync(
      join(PAYROLL_ROOT, "data", "payroll.mutations.server.ts"),
      "utf8"
    )
    const queries = readFileSync(
      join(PAYROLL_ROOT, "data", "payroll.queries.server.ts"),
      "utf8"
    )
    const engine = readFileSync(
      join(PAYROLL_ROOT, "data", "payroll-engine.server.ts"),
      "utf8"
    )

    expect(periodActions).toContain(
      "../../compensation-planning-modeling/server"
    )
    expect(mutations).toContain("compensationSnapshot")
    expect(queries).toContain("parseStoredCompensationSnapshot")
    expect(engine).toContain("PAYROLL_CONTRACT_ALLOWANCE_CURRENCY_MISMATCH")
  })

  it("gates payroll console mutations with surface capabilities", () => {
    const consolePage = readFileSync(
      join(PAYROLL_ROOT, "components", "payroll-console.tsx"),
      "utf8"
    )
    const payrollFeaturePage = readFileSync(
      join(PAYROLL_ROOT, "components", "payroll-page.tsx"),
      "utf8"
    )
    const payrollRoutePage = readFileSync(
      join(
        process.cwd(),
        "app/(main)/[locale]/o/[orgSlug]/apps/hrm/payroll/page.tsx"
      ),
      "utf8"
    )

    expect(consolePage).toContain("capabilities")
    expect(consolePage).toContain("canCreate")
    expect(consolePage).toContain("canUpdate")
    expect(payrollFeaturePage).toContain("resolvePayrollSurfaceCapabilities")
    expect(payrollRoutePage).toContain(
      'import { PayrollPage } from "#features/hrm"'
    )
  })
})
