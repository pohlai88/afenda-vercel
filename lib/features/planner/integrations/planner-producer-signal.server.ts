import "server-only"

import { writeIamAuditEvent } from "#lib/auth"

import { buildPlannerAuditAction } from "../audit/planner-audit.shared"
import {
  createPlannerSignalLink,
  insertPlannerSignal,
} from "../data/planner.mutations.server"
import type {
  PlannerPressureDimensions,
  PlannerSignalClass,
} from "../types"

export async function createPlannerSignalFromErpProducer(input: {
  organizationId: string
  title: string
  description?: string | null
  signalClass: PlannerSignalClass
  originatingSystem: string
  module: string
  entityType: string
  entityId: string
  displayLabel: string
  href?: string | null
  causalityReason: string
  actorUserId?: string | null
  pressure?: Partial<PlannerPressureDimensions>
  auditMetadata?: Record<string, unknown>
}): Promise<{ signalId: string }> {
  const scope = {
    scopeKind: "organization" as const,
    organizationId: input.organizationId,
  }
  const signal = await insertPlannerSignal({
    scope,
    title: input.title,
    description: input.description ?? undefined,
    signalClass: input.signalClass,
    actorUserId: input.actorUserId ?? null,
    originatingSystem: input.originatingSystem,
    pressure: input.pressure,
  })

  await createPlannerSignalLink({
    scope,
    signalId: signal.id,
    module: input.module,
    entityType: input.entityType,
    entityId: input.entityId,
    displayLabel: input.displayLabel,
    href: input.href ?? null,
    causalityReason: input.causalityReason,
    actorUserId: input.actorUserId ?? null,
  })

  await writeIamAuditEvent({
    action: buildPlannerAuditAction("signal", "create"),
    organizationId: input.organizationId,
    actorUserId: input.actorUserId ?? null,
    actorSessionId: null,
    resourceType: "planner_signal",
    resourceId: signal.id,
    metadata: {
      originatingSystem: input.originatingSystem,
      module: input.module,
      entityType: input.entityType,
      entityId: input.entityId,
      causalityReason: input.causalityReason,
      ...input.auditMetadata,
    },
  })

  return { signalId: signal.id }
}
