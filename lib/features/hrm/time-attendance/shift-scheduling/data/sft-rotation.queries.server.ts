import "server-only"

import { asc, eq } from "drizzle-orm"

import { db } from "#lib/db"
import {
  hrmShiftRotationCycle,
  hrmShiftRotationStep,
  hrmShiftTemplate,
} from "#lib/db/schema"

export type RotationCycleWithStepsRow = {
  readonly id: string
  readonly code: string
  readonly name: string
  readonly cycleLengthDays: number
  readonly steps: {
    readonly id: string
    readonly stepIndex: number
    readonly shiftTemplateId: string
    readonly templateCode: string
    readonly templateName: string
  }[]
}

export async function listRotationCyclesWithStepsForOrg(
  organizationId: string
): Promise<RotationCycleWithStepsRow[]> {
  const cycles = await db
    .select({
      id: hrmShiftRotationCycle.id,
      code: hrmShiftRotationCycle.code,
      name: hrmShiftRotationCycle.name,
      cycleLengthDays: hrmShiftRotationCycle.cycleLengthDays,
    })
    .from(hrmShiftRotationCycle)
    .where(eq(hrmShiftRotationCycle.organizationId, organizationId))
    .orderBy(asc(hrmShiftRotationCycle.code))

  if (cycles.length === 0) return []

  const steps = await db
    .select({
      id: hrmShiftRotationStep.id,
      rotationCycleId: hrmShiftRotationStep.rotationCycleId,
      stepIndex: hrmShiftRotationStep.stepIndex,
      shiftTemplateId: hrmShiftRotationStep.shiftTemplateId,
      templateCode: hrmShiftTemplate.code,
      templateName: hrmShiftTemplate.name,
    })
    .from(hrmShiftRotationStep)
    .innerJoin(
      hrmShiftTemplate,
      eq(hrmShiftTemplate.id, hrmShiftRotationStep.shiftTemplateId)
    )
    .where(eq(hrmShiftRotationStep.organizationId, organizationId))
    .orderBy(
      asc(hrmShiftRotationStep.rotationCycleId),
      asc(hrmShiftRotationStep.stepIndex)
    )

  const stepsByCycle = new Map<
    string,
    {
      id: string
      stepIndex: number
      shiftTemplateId: string
      templateCode: string
      templateName: string
    }[]
  >()
  for (const step of steps) {
    const list = stepsByCycle.get(step.rotationCycleId) ?? []
    list.push({
      id: step.id,
      stepIndex: step.stepIndex,
      shiftTemplateId: step.shiftTemplateId,
      templateCode: step.templateCode,
      templateName: step.templateName,
    })
    stepsByCycle.set(step.rotationCycleId, list)
  }

  return cycles.map((cycle) => ({
    id: cycle.id,
    code: cycle.code,
    name: cycle.name,
    cycleLengthDays: cycle.cycleLengthDays,
    steps: stepsByCycle.get(cycle.id) ?? [],
  }))
}
