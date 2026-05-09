"use server"

import {
  requireAuthShellSignedInSession,
  writeIamAuditEventFromNextHeaders,
} from "#lib/auth"

import { revalidatePersonalOneThingSurface } from "../data/onething-revalidate.server"
import { updateOneThingState } from "../data/onething.mutations.server"
import { getOneThingScoped } from "../data/onething.queries.server"

export async function completePersonalOneThing(
  formData: FormData
): Promise<void> {
  const session = await requireAuthShellSignedInSession()
  const oneThingId = String(formData.get("oneThingId") ?? "")
  if (!oneThingId) return

  const row = await getOneThingScoped(oneThingId, null, session.userId)
  if (!row) return

  await updateOneThingState(oneThingId, {
    state: "resolved",
    snoozeUntil: null,
  })

  await writeIamAuditEventFromNextHeaders({
    action: "erp.onething.consequence.resolve",
    actorUserId: session.userId,
    actorSessionId: session.sessionId,
    resourceType: "onething",
    resourceId: oneThingId,
    metadata: { scope: "personal" },
  })

  revalidatePersonalOneThingSurface()
}
