import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const OFFBOARDING_ROOT = join(
  process.cwd(),
  "lib/features/hrm/employee-management/offboarding-exit-management"
)

describe("HRM offboarding exit management contracts", () => {
  it("uses ERP RBAC mutation gate instead of org admin role", () => {
    const actions = readFileSync(
      join(OFFBOARDING_ROOT, "actions", "offboarding.actions.ts"),
      "utf8"
    )

    expect(actions).toContain("requireOffboardingMutationGate")
    expect(actions).toContain("HRM_OFFBOARDING_EXIT_AUDIT")
    expect(actions).not.toContain("canActInOrganization")
    expect(actions).not.toContain("requireHrmAdmin")
    expect(actions).not.toContain("#lib/db")
    expect(actions).not.toContain("hrmOffboardingInstance")
  })

  it("returns null when an active offboarding instance already exists", () => {
    const mutations = readFileSync(
      join(OFFBOARDING_ROOT, "data", "offboarding.mutations.server.ts"),
      "utf8"
    )

    expect(mutations).toContain("if (existing) return null")
    expect(mutations).not.toContain("if (existing) return existing.id")
  })

  it("wires deferred lifecycle schemas to ERP-gated server actions", () => {
    const actions = readFileSync(
      join(OFFBOARDING_ROOT, "actions", "offboarding.actions.ts"),
      "utf8"
    )
    const mutations = readFileSync(
      join(OFFBOARDING_ROOT, "data", "offboarding.mutations.server.ts"),
      "utf8"
    )
    const serverExports = readFileSync(
      join(process.cwd(), "lib", "features", "hrm", "server.ts"),
      "utf8"
    )

    expect(actions).toContain("scheduleExitInterviewAction")
    expect(actions).toContain("recordExitInterviewFeedbackAction")
    expect(actions).toContain("updateSettlementReadinessAction")
    expect(actions).toContain("setRehireEligibilityAction")
    expect(actions).toContain("closeOffboardingCaseAction")
    expect(mutations).toContain("scheduleExitInterviewMutation")
    expect(mutations).toContain("transitionOffboardingTaskMutation")
    expect(mutations).toContain("upsertOffboardingClearanceItemMutation")
    expect(mutations).toContain("closeOffboardingCaseMutation")
    expect(mutations).toContain("HRM_OFFBOARDING_MUTABLE_STATUSES")
    expect(serverExports).toContain("closeOffboardingCaseMutation")
  })

  it("gates org dashboard approval UI with offboarding capabilities", () => {
    const dashboard = readFileSync(
      join(
        OFFBOARDING_ROOT,
        "components",
        "offboarding-org-dashboard-page.tsx"
      ),
      "utf8"
    )

    expect(dashboard).toContain("OffboardingApprovalActions")
    expect(dashboard).toContain("capabilities")
    expect(dashboard).toContain("GovernedPatternCListSection")
  })
})
