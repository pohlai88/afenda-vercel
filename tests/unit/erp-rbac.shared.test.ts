import { describe, expect, it } from "vitest"

import {
  buildErpPermissionKey,
  ERP_PERMISSION_REGISTRY,
  ERP_PERMISSION_REGISTRY_BY_KEY,
  getErpPermissionDefinition,
  isKnownErpPermissionKey,
} from "../../lib/features/erp-rbac/constants"
import { detectSodConflict } from "../../lib/features/erp-rbac/data/sod.shared"

describe("ERP RBAC permission registry", () => {
  it("uses unique keys", () => {
    const keys = ERP_PERMISSION_REGISTRY.map((entry) => entry.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("round-trips canonical permission keys", () => {
    for (const entry of ERP_PERMISSION_REGISTRY) {
      const key = buildErpPermissionKey(entry)
      expect(key).toBe(entry.key)
      expect(isKnownErpPermissionKey(key)).toBe(true)
      expect(getErpPermissionDefinition(key)).toEqual(entry)
      expect(ERP_PERMISSION_REGISTRY_BY_KEY.get(key)).toEqual(entry)
    }
  })

  it("rejects unknown keys", () => {
    expect(isKnownErpPermissionKey("hrm.payroll.approve")).toBe(false)
    expect(getErpPermissionDefinition("hrm.payroll.approve")).toBeNull()
  })
})

describe("ERP RBAC separation of duties", () => {
  it("allows combining read/search/audit with a lifecycle permission", () => {
    expect(
      detectSodConflict([
        { module: "hrm", object: "payroll", function: "read" },
        { module: "hrm", object: "payroll", function: "search" },
        { module: "hrm", object: "payroll", function: "audit" },
        { module: "hrm", object: "payroll", function: "update" },
      ])
    ).toBeNull()
  })

  it("blocks create and update on the same object", () => {
    expect(
      detectSodConflict([
        { module: "hrm", object: "payroll", function: "create" },
        { module: "hrm", object: "payroll", function: "update" },
      ])
    ).toMatchObject({
      module: "hrm",
      object: "payroll",
      functions: ["create", "update"],
    })
  })

  it("blocks update and delete on the same object", () => {
    expect(
      detectSodConflict([
        { module: "planner", object: "notice", function: "update" },
        { module: "planner", object: "notice", function: "delete" },
      ])
    ).toMatchObject({
      module: "planner",
      object: "notice",
      functions: ["delete", "update"],
    })
  })

  it("does not block lifecycle permissions across different objects", () => {
    expect(
      detectSodConflict([
        { module: "hrm", object: "payroll", function: "create" },
        { module: "hrm", object: "employee", function: "update" },
      ])
    ).toBeNull()
  })
})
