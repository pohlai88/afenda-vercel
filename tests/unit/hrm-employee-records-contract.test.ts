import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

const root = process.cwd()

describe("employee records server contract", () => {
  it("uses the employee records audit contract for master and contract actions", () => {
    const employeeMasterActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/employee-master.actions.ts"
      ),
      "utf8"
    )
    const contractActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/employment-contract.actions.ts"
      ),
      "utf8"
    )

    expect(employeeMasterActions).toContain("HRM_EMPLOYEE_RECORDS_AUDIT")
    expect(contractActions).toContain("HRM_EMPLOYEE_RECORDS_AUDIT")
    expect(employeeMasterActions).not.toContain(
      '"erp.hrm.employee.master.update"'
    )
    expect(contractActions).not.toContain('"erp.hrm.contract.create"')
    expect(contractActions).not.toContain('"erp.hrm.contract.activate"')
    expect(contractActions).not.toContain('"erp.hrm.contract.terminate"')
  })

  it("routes employment placement changes through the shared assignment command", () => {
    const employeeMasterActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/employee-master.actions.ts"
      ),
      "utf8"
    )
    const orgStructureActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/organizational-chart-hierarchy/actions/org-structure.actions.ts"
      ),
      "utf8"
    )

    expect(employeeMasterActions).toContain("upsertEmployeeEffectiveAssignment")
    expect(orgStructureActions).toContain("upsertEmployeeEffectiveAssignment")
  })

  it("applies employee archived mutability guard to employee record mutations", () => {
    const employeeMasterActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/employee-master.actions.ts"
      ),
      "utf8"
    )
    const emergencyContactActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/emergency-contact.actions.ts"
      ),
      "utf8"
    )
    const dependentActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/dependent.actions.ts"
      ),
      "utf8"
    )
    const contractActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/employee-records-management/actions/employment-contract.actions.ts"
      ),
      "utf8"
    )
    const documentActions = readFileSync(
      join(
        root,
        "lib/features/hrm/employee-management/documents-management/actions/hrm-document.actions.ts"
      ),
      "utf8"
    )

    expect(employeeMasterActions).toContain("employee_archived")
    expect(emergencyContactActions).toContain("requireMutableEmployeeRecord")
    expect(dependentActions).toContain("requireMutableEmployeeRecord")
    expect(contractActions).toContain("requireMutableEmployeeRecord")
    expect(documentActions).toContain("requireMutableEmployeeRecord")
  })
})
