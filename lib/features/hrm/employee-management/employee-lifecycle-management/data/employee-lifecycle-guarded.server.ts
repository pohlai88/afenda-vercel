import "server-only"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import {
  getEmployeeLifecycleHistory,
  getEmployeeLifecycleSnapshot,
} from "./employee-lifecycle-summary.queries.server"
import type {
  EmployeeLifecycleHistoryRow,
  EmployeeLifecycleSnapshot,
} from "./employee-lifecycle-summary.queries.server"

export type GuardedLifecycleResult<T> =
  | { ok: true; organizationId: string; data: T }
  | { ok: false; error: string }

export async function readEmployeeLifecycleSnapshot(input: {
  employeeId: string
  asOfDate?: Date
  includePending?: boolean
}): Promise<GuardedLifecycleResult<EmployeeLifecycleSnapshot | null>> {
  const gate = await requireHrmPermission({
    object: "employee",
    function: "read",
    errorMessage: "HRM employee lifecycle read permission required.",
  })
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.session.organizationId,
    data: await getEmployeeLifecycleSnapshot(
      gate.session.organizationId,
      input.employeeId,
      {
        asOfDate: input.asOfDate,
        includePending: input.includePending,
      }
    ),
  }
}

export async function readEmployeeLifecycleHistory(input: {
  readonly employeeId: string
  readonly limit?: number
}): Promise<GuardedLifecycleResult<readonly EmployeeLifecycleHistoryRow[]>> {
  const gate = await requireHrmPermission({
    object: "employee",
    function: "read",
    errorMessage: "HRM employee lifecycle history read permission required.",
  })
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.session.organizationId,
    data: await getEmployeeLifecycleHistory({
      organizationId: gate.session.organizationId,
      employeeId: input.employeeId,
      limit: input.limit,
    }),
  }
}

export async function searchEmployeeLifecycleSnapshot(input: {
  readonly employeeId: string
  readonly asOfDate?: Date
  readonly includePending?: boolean
}): Promise<GuardedLifecycleResult<EmployeeLifecycleSnapshot | null>> {
  const gate = await requireHrmPermission({
    object: "employee",
    function: "search",
    errorMessage: "HRM employee lifecycle search permission required.",
  })
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.session.organizationId,
    data: await getEmployeeLifecycleSnapshot(
      gate.session.organizationId,
      input.employeeId,
      {
        asOfDate: input.asOfDate,
        includePending: input.includePending,
      }
    ),
  }
}

export async function searchEmployeeLifecycleHistory(input: {
  readonly employeeId: string
  readonly limit?: number
}): Promise<GuardedLifecycleResult<readonly EmployeeLifecycleHistoryRow[]>> {
  const gate = await requireHrmPermission({
    object: "employee",
    function: "search",
    errorMessage: "HRM employee lifecycle history search permission required.",
  })
  if (!gate.ok) return gate
  return {
    ok: true,
    organizationId: gate.session.organizationId,
    data: await getEmployeeLifecycleHistory({
      organizationId: gate.session.organizationId,
      employeeId: input.employeeId,
      limit: input.limit,
    }),
  }
}
