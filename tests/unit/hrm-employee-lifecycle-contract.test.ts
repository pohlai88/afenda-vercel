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
    expect(mutations).toContain("hrmLifecycleTransition")
    expect(mutations).toContain("upsertEmployeeEffectiveAssignment")
    expect(mutations).toContain("ensureLifecycleOffboardingTriggered")
    expect(mutations).toContain("runLifecycleTransitionDueTick")
    expect(mutations).toContain("transition_failed")
    expect(mutations).toContain(
      "HRM_EMPLOYEE_LIFECYCLE_AUDIT.transition.failed"
    )
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

  it("exports metadata and guarded lifecycle read surfaces through the HRM server door", () => {
    const server = readFileSync(
      join(process.cwd(), "lib/features/hrm/server.ts"),
      "utf8"
    )
    const metadata = readFileSync(
      join(LCM_ROOT, "data", "employee-lifecycle-surface-metadata.shared.ts"),
      "utf8"
    )

    expect(server).toContain("runLifecycleTransitionDueTick")
    expect(server).toContain("getEmployeeLifecycleSnapshot")
    expect(server).toContain("getEmployeeLifecycleHistory")
    expect(server).toContain("EMPLOYEE_LIFECYCLE_METADATA_COLUMNS")
    expect(metadata).toContain("EMPLOYEE_LIFECYCLE_METADATA_FILTERS")
    expect(metadata).toContain("EMPLOYEE_LIFECYCLE_METADATA_ROW_ACTIONS")
  })

  it("registers the lifecycle due-transition cron route", () => {
    const route = readFileSync(
      join(process.cwd(), "app/api/cron/hrm-lifecycle-transition-due/route.ts"),
      "utf8"
    )
    const vercel = readFileSync(join(process.cwd(), "vercel.json"), "utf8")

    expect(route).toContain("runLifecycleTransitionDueTick")
    expect(route).toContain("CRON_SECRET")
    expect(route).toContain("hrm-lifecycle-transition-due")
    expect(vercel).toContain("/api/cron/hrm-lifecycle-transition-due")
  })

  it("defines the effective-dated lifecycle transition table", () => {
    const schema = readFileSync(join(process.cwd(), "lib/db/schema.ts"), "utf8")

    expect(schema).toContain("hrmLifecycleTransition")
    expect(schema).toContain('"hrm_lifecycle_transition"')
    expect(schema).toContain("transitionKind")
    expect(schema).toContain("effectiveDate")
    expect(schema).toContain("payload")
    expect(schema).toContain(
      "hrm_lifecycle_transition_org_emp_kind_eff_status_uidx"
    )
  })

  it("connects contract expiry watch to lifecycle offboarding transition", () => {
    const watchServer = readFileSync(
      join(
        process.cwd(),
        "lib/features/hrm/employee-management/employee-lifecycle-management/data/contract-expiry-watch.server.ts"
      ),
      "utf8"
    )
    const contractContract = readFileSync(
      join(
        process.cwd(),
        "lib/features/hrm/employee-management/employee-lifecycle-management/employee-lifecycle.contract.ts"
      ),
      "utf8"
    )
    const route = readFileSync(
      join(process.cwd(), "app/api/cron/hrm-contract-expiry-watch/route.ts"),
      "utf8"
    )

    expect(watchServer).toContain("triggerContractExpiryLifecycleTransition")
    expect(watchServer).toContain("contractExpiryTransitions")
    expect(watchServer).toContain("triggerContractExpiryLifecycleTransition")
    expect(contractContract).toContain("expiry_reached")
    expect(route).toContain("contractExpiryTransitions")
  })
})
