import "server-only"

import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

export type SftEmployeeRow = {
  readonly id: string
  readonly employeeNumber: string | null
  readonly legalName: string
  readonly managerEmployeeId: string | null
}

export async function findSftEmployeeForUser(
  organizationId: string,
  userId: string
): Promise<SftEmployeeRow | null> {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
      managerEmployeeId: hrmEmployee.managerEmployeeId,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        eq(hrmEmployee.linkedUserId, userId),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .limit(1)

  return rows[0] ?? null
}

export async function listActiveEmployeeChoicesForSft(
  organizationId: string
): Promise<
  readonly {
    readonly id: string
    readonly employeeNumber: string | null
    readonly legalName: string
  }[]
> {
  const rows = await db
    .select({
      id: hrmEmployee.id,
      employeeNumber: hrmEmployee.employeeNumber,
      legalName: hrmEmployee.legalName,
    })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, organizationId),
        isNull(hrmEmployee.archivedAt)
      )
    )
    .orderBy(hrmEmployee.legalName)

  return rows
}
