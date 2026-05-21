import "server-only"

import { and, count, eq, sql } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmCareerPathFramework,
  hrmCareerPathStage,
} from "#lib/db/schema"

import type {
  CareerPathFrameworkRow,
  CareerPathStageRow,
} from "./career-pathing.types.shared"

export async function listCareerPathFrameworksForOrg(
  organizationId: string
): Promise<CareerPathFrameworkRow[]> {
  const rows = await db
    .select({
      id: hrmCareerPathFramework.id,
      code: hrmCareerPathFramework.code,
      name: hrmCareerPathFramework.name,
      description: hrmCareerPathFramework.description,
      pathKind: hrmCareerPathFramework.pathKind,
      status: hrmCareerPathFramework.status,
      stageCount: sql<number>`cast(count(${hrmCareerPathStage.id}) as int)`,
    })
    .from(hrmCareerPathFramework)
    .leftJoin(
      hrmCareerPathStage,
      eq(hrmCareerPathStage.frameworkId, hrmCareerPathFramework.id)
    )
    .where(eq(hrmCareerPathFramework.organizationId, organizationId))
    .groupBy(
      hrmCareerPathFramework.id,
      hrmCareerPathFramework.code,
      hrmCareerPathFramework.name,
      hrmCareerPathFramework.description,
      hrmCareerPathFramework.pathKind,
      hrmCareerPathFramework.status
    )
    .orderBy(hrmCareerPathFramework.code)

  return rows.map((row) => ({
    ...row,
    stageCount: Number(row.stageCount ?? 0),
  }))
}

export async function listCareerPathStagesForFramework(
  organizationId: string,
  frameworkId: string
): Promise<CareerPathStageRow[]> {
  const rows = await db
    .select({
      id: hrmCareerPathStage.id,
      frameworkId: hrmCareerPathStage.frameworkId,
      sequence: hrmCareerPathStage.sequence,
      title: hrmCareerPathStage.title,
      description: hrmCareerPathStage.description,
      targetGradeRef: hrmCareerPathStage.targetGradeRef,
      expectedMonths: hrmCareerPathStage.expectedMonths,
    })
    .from(hrmCareerPathStage)
    .where(
      and(
        eq(hrmCareerPathStage.organizationId, organizationId),
        eq(hrmCareerPathStage.frameworkId, frameworkId)
      )
    )
    .orderBy(hrmCareerPathStage.sequence)

  return rows
}

export async function countActiveCareerPathFrameworksForOrg(
  organizationId: string
): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(hrmCareerPathFramework)
    .where(
      and(
        eq(hrmCareerPathFramework.organizationId, organizationId),
        eq(hrmCareerPathFramework.status, "active")
      )
    )
  return Number(row?.total ?? 0)
}
