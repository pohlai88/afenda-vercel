"use server"

import {
  requireAuthShellSignedInSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"

import { revalidatePersonalOneThingSurface } from "../data/onething-revalidate.server"
import { deleteOneThingById } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function deletePersonalOneThing(
  formData: FormData
): Promise<void> {
  const session = await requireAuthShellSignedInSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getOneThingScoped(oneThingId, null, session.userId)
  if (!row) return

  await deleteOneThingById(oneThingId)

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.delete",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: { scope: "personal" },
  })

  revalidatePersonalOneThingSurface()
}
