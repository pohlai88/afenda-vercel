import "server-only"

import { cache } from "react"
import { and, eq, isNull } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmEmployee } from "#lib/db/schema"

export type AatManagerContext = {
  employeeId: string
  employeeNumber: string
  legalName: string
}

export const findAatManagerContextForUser = cache(
  async function findAatManagerContextForUser(input: {
    organizationId: string
    userId: string
  }): Promise<AatManagerContext | null> {
    const row = await db.query.hrmEmployee.findFirst({
      where: and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.linkedUserId, input.userId),
        eq(hrmEmployee.employmentStatus, "active"),
        isNull(hrmEmployee.archivedAt)
      ),
      columns: {
        id: true,
        employeeNumber: true,
        legalName: true,
      },
    })

    if (!row) return null

    return {
      employeeId: row.id,
      employeeNumber: row.employeeNumber,
      legalName: row.legalName,
    }
  }
)
