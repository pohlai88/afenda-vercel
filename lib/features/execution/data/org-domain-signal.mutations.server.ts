import "server-only"

import { db } from "#lib/db"
import { orgDomainSignalOutbox } from "#lib/db/schema"

import type { OrgDomainSignalPayload } from "../schemas/org-domain-signal-payload.schema"

export async function insertOrgDomainSignalOutboxRow(
  input: OrgDomainSignalPayload
): Promise<string> {
  const [row] = await db
    .insert(orgDomainSignalOutbox)
    .values({
      organizationId: input.organizationId,
      signalKey: input.signalKey,
      payload: input.payload,
      actorUserId: input.actorUserId,
      actorSessionId: input.actorSessionId,
    })
    .returning({ id: orgDomainSignalOutbox.id })

  const id = row?.id
  if (!id) {
    throw new Error("org_domain_signal_outbox insert did not return an id.")
  }
  return id
}
