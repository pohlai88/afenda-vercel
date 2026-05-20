"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmShiftRotationCycle, hrmShiftRotationStep } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { SftRotationCycleFormState } from "../../../types"
import { HRM_SFT_AUDIT } from "../sft.contract"
import {
  addRotationStepSchema,
  createRotationCycleSchema,
} from "../schemas/sft.schema"
import { getActiveShiftTemplateForOrg } from "../data/sft-template.queries.server"
import { revalidateSftSurfaces } from "../data/sft-revalidate.server"

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { readonly code?: unknown }).code === "23505"
  )
}

export async function createRotationCycleAction(
  _prev: SftRotationCycleFormState | undefined,
  formData: FormData
): Promise<SftRotationCycleFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = createRotationCycleSchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    cycleLengthDays: formData.get("cycleLengthDays") ?? undefined,
    shiftTemplateId: formData.get("shiftTemplateId"),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: flat.code?.[0],
      name: flat.name?.[0],
      cycleLengthDays: flat.cycleLengthDays?.[0],
      shiftTemplateId: flat.shiftTemplateId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const cycleId = crypto.randomUUID()
  const stepId = crypto.randomUUID()

  try {
    await db.transaction(async (tx) => {
      await tx.insert(hrmShiftRotationCycle).values({
        id: cycleId,
        organizationId: session.organizationId,
        code: parsed.data.code,
        name: parsed.data.name,
        cycleLengthDays: parsed.data.cycleLengthDays,
        createdByUserId: session.userId,
        updatedByUserId: session.userId,
      })
      await tx.insert(hrmShiftRotationStep).values({
        id: stepId,
        organizationId: session.organizationId,
        rotationCycleId: cycleId,
        stepIndex: 0,
        shiftTemplateId: parsed.data.shiftTemplateId,
      })
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return hrmActionFailure({
        code: "A rotation cycle with this code already exists.",
      })
    }
    throw error
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.rotationCycleCreate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_rotation_cycle",
    resourceId: cycleId,
    metadata: {
      code: parsed.data.code,
      cycleLengthDays: parsed.data.cycleLengthDays,
      shiftTemplateId: parsed.data.shiftTemplateId,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, rotationCycleId: cycleId }
}

export async function addRotationStepAction(
  _prev: SftRotationCycleFormState | undefined,
  formData: FormData
): Promise<SftRotationCycleFormState> {
  const gate = await requireHrmPermission({
    object: "shift_schedule",
    function: "create",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })
  const { session } = gate

  const parsed = addRotationStepSchema.safeParse({
    rotationCycleId: formData.get("rotationCycleId"),
    shiftTemplateId: formData.get("shiftTemplateId"),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      shiftTemplateId: flat.shiftTemplateId?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const [cycleRows, template, existingSteps] = await Promise.all([
    db
      .select({
        id: hrmShiftRotationCycle.id,
        cycleLengthDays: hrmShiftRotationCycle.cycleLengthDays,
      })
      .from(hrmShiftRotationCycle)
      .where(
        and(
          eq(hrmShiftRotationCycle.organizationId, session.organizationId),
          eq(hrmShiftRotationCycle.id, parsed.data.rotationCycleId)
        )
      )
      .limit(1),
    getActiveShiftTemplateForOrg({
      organizationId: session.organizationId,
      shiftTemplateId: parsed.data.shiftTemplateId,
    }),
    db
      .select({ stepIndex: hrmShiftRotationStep.stepIndex })
      .from(hrmShiftRotationStep)
      .where(
        and(
          eq(hrmShiftRotationStep.organizationId, session.organizationId),
          eq(hrmShiftRotationStep.rotationCycleId, parsed.data.rotationCycleId)
        )
      ),
  ])

  const cycle = cycleRows[0]
  if (!cycle) {
    return hrmActionFailure({ form: "Rotation cycle not found." })
  }
  if (!template) {
    return hrmActionFailure({
      shiftTemplateId: "Shift template not found or inactive.",
    })
  }

  const nextIndex =
    existingSteps.length === 0
      ? 0
      : Math.max(...existingSteps.map((row) => row.stepIndex)) + 1

  if (nextIndex >= cycle.cycleLengthDays) {
    return hrmActionFailure({
      form: `Rotation cycle allows at most ${cycle.cycleLengthDays} steps (0–${cycle.cycleLengthDays - 1}).`,
    })
  }

  const stepId = crypto.randomUUID()

  try {
    await db.insert(hrmShiftRotationStep).values({
      id: stepId,
      organizationId: session.organizationId,
      rotationCycleId: parsed.data.rotationCycleId,
      stepIndex: nextIndex,
      shiftTemplateId: parsed.data.shiftTemplateId,
    })
  } catch (error) {
    if (isUniqueViolation(error)) {
      return hrmActionFailure({
        form: "This step index already exists for the rotation cycle.",
      })
    }
    throw error
  }

  await writeIamAuditEventFromNextHeaders({
    action: HRM_SFT_AUDIT.rotationStepCreate,
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    organizationId: session.organizationId,
    resourceType: "hrm_shift_rotation_step",
    resourceId: stepId,
    metadata: {
      rotationCycleId: parsed.data.rotationCycleId,
      stepIndex: nextIndex,
      shiftTemplateId: parsed.data.shiftTemplateId,
    },
  })

  revalidateSftSurfaces()
  return { ok: true, rotationCycleId: parsed.data.rotationCycleId }
}
