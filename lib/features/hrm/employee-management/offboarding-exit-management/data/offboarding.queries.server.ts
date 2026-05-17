import "server-only"

import { and, desc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import { hrmOffboardingInstance } from "#lib/db/schema"

import type { OffboardingChecklistTask } from "./offboarding-defaults.shared"
import {
  readOffboardingInstanceDetails,
  type OffboardingInstanceDetails,
} from "./offboarding-instance-metadata.server"

export type OffboardingInstanceRow = OffboardingInstanceDetails & {
  id: string
  status: string
  terminationDate: string
  checklist: OffboardingChecklistTask[]
  updatedAt: Date
}

export async function listOpenOffboardingForEmployee(
  organizationId: string,
  employeeId: string
): Promise<OffboardingInstanceRow[]> {
  const rows = await db.query.hrmOffboardingInstance.findMany({
    where: and(
      eq(hrmOffboardingInstance.organizationId, organizationId),
      eq(hrmOffboardingInstance.employeeId, employeeId),
      eq(hrmOffboardingInstance.status, "open")
    ),
    columns: {
      id: true,
      status: true,
      terminationDate: true,
      checklist: true,
      audit7w1h: true,
      updatedAt: true,
    },
    orderBy: [desc(hrmOffboardingInstance.createdAt)],
  })

  return rows.map((r) => {
    const td = r.terminationDate as unknown
    const terminationDate =
      td instanceof Date
        ? td.toISOString().slice(0, 10)
        : typeof td === "string"
          ? td.slice(0, 10)
          : String(td).slice(0, 10)
    const details = readOffboardingInstanceDetails(r.audit7w1h)
    return {
      id: r.id,
      status: r.status,
      terminationDate,
      ...details,
      checklist: (r.checklist as OffboardingChecklistTask[]) ?? [],
      updatedAt: r.updatedAt,
    }
  })
}
