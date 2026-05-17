import "server-only"

import { and, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

type EmployeeRecordMutationClient = Pick<typeof db, "select">

export type MutableEmployeeRecord = {
  readonly id: string
  readonly archivedAt: Date | null
}

export type MutableEmployeeRecordResult =
  | { readonly ok: true; readonly employee: MutableEmployeeRecord }
  | { readonly ok: false; readonly code: "not_found" | "archived" }

export async function requireMutableEmployeeRecord(
  input: {
    readonly organizationId: string
    readonly employeeId: string
  },
  client: EmployeeRecordMutationClient = db
): Promise<MutableEmployeeRecordResult> {
  const [employee] = await client
    .select({
      id: hrmEmployee.id,
      archivedAt: hrmEmployee.archivedAt,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, input.employeeId)
      )
    )
    .limit(1)

  if (!employee) return { ok: false, code: "not_found" }
  if (employee.archivedAt) return { ok: false, code: "archived" }

  return { ok: true, employee }
}

export function mutableEmployeeRecordErrorMessage(
  result: Extract<MutableEmployeeRecordResult, { ok: false }>
): string {
  return result.code === "not_found"
    ? "Employee not found."
    : "Archived employees cannot be edited."
}
