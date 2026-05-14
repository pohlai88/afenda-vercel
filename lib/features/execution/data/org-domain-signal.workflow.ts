import { writeIamAuditEvent } from "#lib/auth"

import { EXECUTION_AUDIT_ACTIONS } from "../execution.contract"
import type { OrgDomainSignalPayload } from "../schemas/org-domain-signal-payload.schema"
import { orgDomainSignalPayloadSchema } from "../schemas/org-domain-signal-payload.schema"
import { insertOrgDomainSignalOutboxRow } from "./org-domain-signal.mutations.server"

export async function orgDomainSignalWorkflow(raw: unknown) {
  "use workflow"

  const payload = orgDomainSignalPayloadSchema.parse(raw)
  await persistOrgDomainSignalStep(payload)
}

async function persistOrgDomainSignalStep(payload: OrgDomainSignalPayload) {
  "use step"

  const outboxId = await insertOrgDomainSignalOutboxRow(payload)

  await writeIamAuditEvent({
    action: EXECUTION_AUDIT_ACTIONS.DOMAIN_SIGNAL_RECORDED,
    actorUserId: payload.actorUserId,
    actorSessionId: payload.actorSessionId,
    organizationId: payload.organizationId,
    resourceType: "org_domain_signal",
    resourceId: outboxId,
    metadata: {
      signalKey: payload.signalKey,
    },
  })
}
