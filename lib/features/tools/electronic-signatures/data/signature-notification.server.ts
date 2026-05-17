import "server-only"

import { and, eq } from "drizzle-orm"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"
import { db } from "#lib/db"
import { hrmEmployee, hrmSignatureParty } from "#lib/db/schema"

import { toolsSignatureCeremonyPath } from "../../constants"

export async function notifySignaturePartyPortalDelivery(input: {
  readonly organizationId: string
  readonly partyId: string
  readonly portalSlug?: string
  readonly title: string
  readonly body: string
}): Promise<void> {
  const [party] = await db
    .select({
      token: hrmSignatureParty.token,
      signerEmployeeId: hrmSignatureParty.signerEmployeeId,
      requestId: hrmSignatureParty.requestId,
    })
    .from(hrmSignatureParty)
    .where(
      and(
        eq(hrmSignatureParty.organizationId, input.organizationId),
        eq(hrmSignatureParty.id, input.partyId)
      )
    )
    .limit(1)

  if (!party?.token || !party.signerEmployeeId) {
    return
  }

  const [employee] = await db
    .select({ linkedUserId: hrmEmployee.linkedUserId })
    .from(hrmEmployee)
    .where(
      and(
        eq(hrmEmployee.organizationId, input.organizationId),
        eq(hrmEmployee.id, party.signerEmployeeId)
      )
    )
    .limit(1)

  if (!employee?.linkedUserId) {
    return
  }

  await publishOrgNotificationIfMissing({
    organizationId: input.organizationId,
    targetUserId: employee.linkedUserId,
    title: input.title,
    body: input.body,
    severity: "info",
    linkedEntityType: "hrm_signature_request",
    linkedEntityId: party.requestId,
    linkedEntityLabel: "Signature request",
    linkedPath: input.portalSlug
      ? toolsSignatureCeremonyPath(input.portalSlug, party.token)
      : `/employee/signatures/${party.token}`,
    expiresAt: null,
  })
}
