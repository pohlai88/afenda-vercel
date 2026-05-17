import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const LCM_ROOT = join(
  process.cwd(),
  "lib/features/hrm/employee-management/employee-lifecycle-management"
)

describe("HRM employee lifecycle management contracts", () => {
  it("uses ERP RBAC mutation gate and canonical audit strings", () => {
    const actions = readFileSync(
      join(LCM_ROOT, "actions", "onboarding.actions.ts"),
      "utf8"
    )

    expect(actions).toContain("requireEmployeeLifecycleMutationGate")
    expect(actions).toContain("HRM_EMPLOYEE_LIFECYCLE_AUDIT")
    expect(actions).not.toContain("requireHrmAdmin")
    expect(actions).not.toContain("requireHrmOrgTenantFromForm")
    expect(actions).not.toContain("erp.hrm.onboarding.step.complete")
  })

  it("resolves onboarding capabilities from ERP permissions", () => {
    const page = readFileSync(
      join(LCM_ROOT, "components", "hrm-onboarding-page.tsx"),
      "utf8"
    )

    expect(page).toContain("resolveOnboardingSurfaceCapabilities")
    expect(page).not.toContain("requireHrmAdmin")
    expect(page).not.toContain("isAdmin")
  })

  it("gates employment status change actions with employee ERP update permission", () => {
    const statusActions = readFileSync(
      join(LCM_ROOT, "actions", "employment-status-change.actions.ts"),
      "utf8"
    )
    const guard = readFileSync(
      join(LCM_ROOT, "data", "employee-lifecycle-action-guard.server.ts"),
      "utf8"
    )
    const mutations = readFileSync(
      join(LCM_ROOT, "data", "employee-lifecycle.mutations.server.ts"),
      "utf8"
    )

    expect(statusActions).toContain("requireEmployeeLifecycleRecordGate")
    expect(statusActions).toContain("HRM_EMPLOYEE_LIFECYCLE_AUDIT")
    expect(statusActions).toContain("recordProbationOutcomeAction")
    expect(statusActions).toContain("changeEmploymentStatusAction")
    expect(statusActions).not.toContain("requireHrmAdmin")
    expect(guard).toContain("requireEmployeeLifecycleRecordGate")
    expect(mutations).toContain("assertEmploymentStatusTransition")
    expect(mutations).toContain("hrmLifecycleEvent")
  })

  it("gates boarding task actions with kind-aware ERP permissions", () => {
    const boarding = readFileSync(
      join(LCM_ROOT, "actions", "boarding.actions.ts"),
      "utf8"
    )
    const guard = readFileSync(
      join(LCM_ROOT, "data", "employee-lifecycle-action-guard.server.ts"),
      "utf8"
    )

    expect(boarding).toContain("requireBoardingTaskMutationGate")
    expect(boarding).toContain("HRM_EMPLOYEE_LIFECYCLE_AUDIT.boarding")
    expect(boarding).not.toContain("requireHrmAdmin")
    expect(guard).toContain("requireBoardingTaskMutationGate")
  })
})
