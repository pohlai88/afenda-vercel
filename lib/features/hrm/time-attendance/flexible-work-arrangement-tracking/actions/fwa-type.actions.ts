"use server"

import { and, eq } from "drizzle-orm"

import { writeIamAuditEventFromNextHeaders } from "#lib/auth"
import { db } from "#lib/db"
import { hrmFlexibleWorkArrangementType } from "#lib/db/schema"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type { CreateFwaTypeFormState } from "../../../types"
import { HRM_FWA_AUDIT } from "../fwa.contract"
import { createFwaArrangementTypeFormSchema } from "../schemas/fwa.schema"
import { revalidateFwaSurfaces } from "../data/fwa-revalidate.server"

export async function createFwaArrangementTypeAction(
  _prev: CreateFwaTypeFormState | undefined,
  formData: FormData
): Promise<CreateFwaTypeFormState> {
  const gate = await requireHrmPermission({
    object: "flexible_work",
    function: "update",
    errorMessage: "Flexible work update permission required to create types.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = createFwaArrangementTypeFormSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
    arrangementKind: formData.get("arrangementKind"),
    description: formData.get("description") || null,
    requiresRemoteLocation: formData.get("requiresRemoteLocation") === "on",
    requiresSupportingDocument:
      formData.get("requiresSupportingDocument") === "on",
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: errs.code?.[0],
      label: errs.label?.[0],
      arrangementKind: errs.arrangementKind?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const { data } = parsed

  const existing = await db.query.hrmFlexibleWorkArrangementType.findFirst({
    where: and(
      eq(hrmFlexibleWorkArrangementType.organizationId, organizationId),
      eq(hrmFlexibleWorkArrangementType.code, data.code)
    ),
    columns: { id: true },
  })

  if (existing) {
    return hrmActionFailure({ code: "A type with this code already exists." })
  }

  const typeId = crypto.randomUUID()

  await db.insert(hrmFlexibleWorkArrangementType).values({
    id: typeId,
    organizationId,
    code: data.code,
    label: data.label,
    arrangementKind: data.arrangementKind,
    description: data.description,
    requiresRemoteLocation: data.requiresRemoteLocation ?? false,
    requiresSupportingDocument: data.requiresSupportingDocument ?? false,
    createdByUserId: userId,
    updatedByUserId: userId,
  })

  await writeIamAuditEventFromNextHeaders({
    action: HRM_FWA_AUDIT.typeCreate,
    actorUserId: userId,
    actorSessionId: sessionId,
    organizationId,
    resourceType: "hrm_flexible_work_arrangement_type",
    resourceId: typeId,
    metadata: {
      code: data.code,
      arrangementKind: data.arrangementKind,
    },
  })

  revalidateFwaSurfaces()
  return { ok: true, typeId }
}
