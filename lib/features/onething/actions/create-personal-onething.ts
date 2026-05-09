"use server"

import {
  requireAuthShellSignedInSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"

import {
  createOrgOneThingSchema,
  parseOptionalDueAt,
  readFormDataJsonField,
} from "../schemas/onething.schema"
import type { CreateOrgOneThingFormState } from "../types"
import {
  ensureDefaultOneThingListForUser,
  insertPersonalOneThing,
} from "../data/onething.mutations.server"
import { revalidatePersonalOneThingSurface } from "../data/onething-revalidate.server"

export async function createPersonalOneThing(
  _prev: CreateOrgOneThingFormState,
  formData: FormData
): Promise<CreateOrgOneThingFormState> {
  const session = await requireAuthShellSignedInSession()

  const parsed = createOrgOneThingSchema
    .omit({ assigneeUserId: true })
    .safeParse({
      title: formData.get("title"),
      consequence: formData.get("consequence") ?? "",
      severity: formData.get("severity") ?? "medium",
      dueAt: formData.get("dueAt") ?? "",
      listId: formData.get("listId") ?? "",
      linkage: readFormDataJsonField(formData, "linkage"),
      counterparty: readFormDataJsonField(formData, "counterparty"),
      provenance: readFormDataJsonField(formData, "provenance"),
      impact: readFormDataJsonField(formData, "impact"),
    })

  if (!parsed.success) {
    const fe = parsed.error.flatten().fieldErrors
    return {
      ok: false,
      errors: {
        title: fe.title?.[0],
      },
    }
  }

  const defaultListId = await ensureDefaultOneThingListForUser(session.userId)
  const listId = parsed.data.listId ?? defaultListId

  const dueAt = parseOptionalDueAt(parsed.data.dueAt ?? undefined)

  const linkage = parsed.data.linkage ?? null
  const counterparty = parsed.data.counterparty ?? null
  const provenance = parsed.data.provenance ?? null
  const impact = parsed.data.impact ?? null

  let row: { id: string }
  try {
    row = await insertPersonalOneThing({
      listId,
      ownerUserId: session.userId,
      title: parsed.data.title,
      consequence: parsed.data.consequence ?? "",
      severity: parsed.data.severity,
      dueAt,
      linkage,
      counterparty,
      provenance,
      impact,
    })
  } catch {
    return { ok: false, errors: { form: "Could not create OneThing." } }
  }

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.create",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "onething",
    resourceId: row.id,
    metadata: {
      scope: "personal",
      listId,
      ...(linkage?.runId ? { runId: linkage.runId } : {}),
      ...(provenance?.kind ? { provenance: provenance.kind } : {}),
    },
  })

  revalidatePersonalOneThingSurface()
  return { ok: true }
}
