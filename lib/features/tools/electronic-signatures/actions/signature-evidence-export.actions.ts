"use server"

import { requireToolsErpPermission } from "../../_module-governance/tools-admin-guard.server"
import { buildSignatureEvidenceExport } from "../data/signature-evidence-export.server"

export async function exportSignatureEvidenceAction(input: {
  readonly orgSlug: string
  readonly requestId: string
}): Promise<{ ok: true; json: string } | { ok: false; error: string }> {
  const perm = await requireToolsErpPermission({
    object: "signature",
    function: "read",
    errorMessage: "Signature read permission required.",
  })
  if (!perm.ok) {
    return { ok: false, error: perm.error }
  }

  const evidence = await buildSignatureEvidenceExport({
    organizationId: perm.session.organizationId,
    requestId: input.requestId,
  })

  if (!evidence.envelope) {
    return { ok: false, error: "Signed envelope is not available yet." }
  }

  return {
    ok: true,
    json: JSON.stringify(
      {
        envelope: evidence.envelope,
        timeline: evidence.timeline.map((event) => ({
          id: event.id,
          type: event.type,
          occurredAt: event.occurredAt.toISOString(),
          partyId: event.partyId,
          data: event.data,
        })),
      },
      null,
      2
    ),
  }
}
