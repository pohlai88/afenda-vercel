import "server-only"

import { and, eq } from "drizzle-orm"

import type { db } from "#lib/db"
import * as schema from "#lib/db/schema"

import { buildDefaultOffboardingChecklist } from "./offboarding-defaults.shared"
import {
  mergeOffboardingInstanceDetails,
  type OffboardingInstanceDetailsPatch,
} from "./offboarding-instance-metadata.server"

export type HrmOffboardingDbExecutor = Parameters<
  Parameters<typeof db.transaction>[0]
>[0]

export async function insertDefaultOffboardingInstance(
  tx: HrmOffboardingDbExecutor,
  input: {
    readonly organizationId: string
    readonly employeeId: string
    readonly terminationDate: Date
    readonly createdByUserId: string
    readonly details?: OffboardingInstanceDetailsPatch
  }
): Promise<void> {
  const t = schema.hrmOffboardingInstance
  const existing = await tx.query.hrmOffboardingInstance.findFirst({
    where: and(
      eq(t.organizationId, input.organizationId),
      eq(t.employeeId, input.employeeId),
      eq(t.status, "open")
    ),
    columns: { id: true },
  })
  if (existing) return

  await tx.insert(t).values({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
    terminationDate: input.terminationDate,
    checklist: buildDefaultOffboardingChecklist(),
    audit7w1h: input.details
      ? mergeOffboardingInstanceDetails(null, input.details)
      : null,
    status: "open",
    createdByUserId: input.createdByUserId,
    updatedByUserId: input.createdByUserId,
  })
}
