"use server"

import { requireHrmPermission } from "../../../_module-governance/hrm-admin-guard.server"
import { hrmActionFailure } from "../../../_module-governance/hrm-action-result.shared"
import type {
  CreateOtmTypeFormState,
  SeedOtmTypesFormState,
} from "../../../types"
import { createOtmTypeFormSchema } from "../schemas/otm.schema"
import { createOtmType, seedDefaultOtmTypes } from "../data/otm-type-commands.server"

export async function createOtmTypeAction(
  _prev: CreateOtmTypeFormState | undefined,
  formData: FormData
): Promise<CreateOtmTypeFormState> {
  const gate = await requireHrmPermission({
    object: "overtime",
    function: "update",
    errorMessage: "Overtime update permission required to create types.",
  })
  if (!gate.ok) return hrmActionFailure({ form: gate.error })

  const { session } = gate
  const { organizationId, userId, sessionId } = session

  const parsed = createOtmTypeFormSchema.safeParse({
    code: formData.get("code"),
    label: formData.get("label"),
    dayCategory: formData.get("dayCategory"),
    description: formData.get("description") || null,
  })

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors
    return hrmActionFailure({
      code: errs.code?.[0],
      label: errs.label?.[0],
      dayCategory: errs.dayCategory?.[0],
      form: parsed.error.issues[0]?.message,
    })
  }

  const result = await createOtmType({
    organizationId,
    userId,
    sessionId,
    code: parsed.data.code,
    label: parsed.data.label,
    dayCategory: parsed.data.dayCategory,
    description: parsed.data.description ?? null,
  })

  if (!result.ok) {
    return hrmActionFailure({
      code: result.errors.code,
      form: result.errors.form,
    })
  }

  return { ok: true, typeId: result.typeId }
}

export async function seedDefaultOtmTypesAction(
  _prev: SeedOtmTypesFormState | undefined,
  _formData: FormData
): Promise<SeedOtmTypesFormState> {
  const gate = await requireHrmPermission({
    object: "overtime",
    function: "update",
    errorMessage: "Overtime update permission required to seed types.",
  })
  if (!gate.ok) return { ok: false, errors: { form: gate.error } }

  const { session } = gate
  const result = await seedDefaultOtmTypes({
    organizationId: session.organizationId,
    userId: session.userId,
    sessionId: session.sessionId,
  })

  return { ok: true, seeded: result.seeded, skipped: result.skipped }
}
