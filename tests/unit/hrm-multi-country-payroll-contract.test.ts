import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const MCP_ROOT = join(
  process.cwd(),
  "lib/features/hrm/payroll-compensation/multi-country-payroll"
)

describe("HRM multi-country payroll contracts", () => {
  it("uses ERP payroll RBAC for server actions and RSC access", () => {
    const actions = readFileSync(
      join(MCP_ROOT, "actions", "multi-country-payroll.actions.ts"),
      "utf8"
    )
    const access = readFileSync(
      join(MCP_ROOT, "data", "multi-country-payroll-access.server.ts"),
      "utf8"
    )

    expect(actions).toContain("requirePayrollMutationGate")
    expect(actions).toContain("HRM_MULTI_COUNTRY_PAYROLL_AUDIT")
    expect(actions).not.toContain("canActInOrganization")
    expect(actions).not.toContain("requireHrmAdmin")
    expect(access).toContain('object: "payroll"')
    expect(access).toContain("requireMultiCountryPayrollSearchSession")
  })

  it("wires deferred configuration schemas to mutations and actions", () => {
    const actions = readFileSync(
      join(MCP_ROOT, "actions", "multi-country-payroll.actions.ts"),
      "utf8"
    )
    const mutations = readFileSync(
      join(MCP_ROOT, "data", "multi-country-payroll.mutations.server.ts"),
      "utf8"
    )

    expect(actions).toContain("upsertLegalEntityPayrollConfigAction")
    expect(actions).toContain("recordPayrollExchangeRateAction")
    expect(actions).toContain("upsertPayComponentTreatmentAction")
    expect(mutations).toContain("upsertLegalEntityPayrollConfigMutation")
    expect(mutations).toContain("insertPayrollExchangeRateMutation")
    expect(mutations).toContain("upsertPayComponentCountryTreatmentMutation")
    expect(mutations).toContain("hrmPayrollLegalEntityConfig")
    expect(mutations).toContain("hrmPayComponentCountryTreatment")
    expect(mutations).not.toContain("id: input.config.legalEntityCode.trim()")
    expect(mutations).not.toContain(
      "id: `${input.treatment.countryCode.toUpperCase()}:${input.treatment.componentCode}`"
    )
  })

  it("gates metadata-driven country config and cross-country report panels with search access", () => {
    const configPanel = readFileSync(
      join(MCP_ROOT, "components", "country-payroll-config-panel.tsx"),
      "utf8"
    )
    const reportPanel = readFileSync(
      join(MCP_ROOT, "components", "cross-country-payroll-summary-panel.tsx"),
      "utf8"
    )

    expect(configPanel).toContain("requireMultiCountryPayrollSearchSession")
    expect(configPanel).not.toContain("requireOrgSession")
    expect(configPanel).toContain("GovernedPatternCListSection")
    expect(configPanel).not.toContain("<table")
    expect(reportPanel).toContain("requireMultiCountryPayrollSearchSession")
    expect(reportPanel).not.toContain("requireOrgSession")
    expect(reportPanel).toContain("GovernedPatternCListSection")
    expect(reportPanel).not.toContain("<table")
  })

  it("keeps multi-country payroll tables in the Drizzle schema", () => {
    const schema = readFileSync(join(process.cwd(), "lib/db/schema.ts"), "utf8")

    expect(schema).toContain("hrmPayrollLegalEntityConfig")
    expect(schema).toContain("hrm_payroll_legal_entity_config")
    expect(schema).toContain("hrmPayComponentCountryTreatment")
    expect(schema).toContain("hrm_pay_component_country_treatment")
  })

  it("prepares serializable governed list-surface metadata", () => {
    const surfaceBuilder = readFileSync(
      join(MCP_ROOT, "data", "multi-country-payroll-list-surface.server.ts"),
      "utf8"
    )
    const payrollPage = readFileSync(
      join(
        process.cwd(),
        "lib/features/hrm/payroll-compensation/payroll-processing/components/payroll-page.tsx"
      ),
      "utf8"
    )

    expect(surfaceBuilder).toContain("ListSurfaceRendererConfigurationInput")
    expect(surfaceBuilder).toContain('dataNature: "table"')
    expect(surfaceBuilder).toContain("requiresErpPermission")
    expect(payrollPage).toContain("CountryPayrollConfigPanel")
    expect(payrollPage).toContain("CrossCountryPayrollSummaryPanel")
  })
})
