import "server-only"

import { publishOrgNotificationIfMissing } from "#features/org-notifications/server"

export type EssRequestLifecycleKind =
  | "profile_update"
  | "document_request"
  | "policy_acknowledgement"

export type EssRequestLifecycleStatus =
  | "submitted"
  | "approved"
  | "rejected"
  | "returned"

const STATUS_COPY: Record<EssRequestLifecycleStatus, string> = {
  submitted: "submitted",
  approved: "approved",
  rejected: "rejected",
  returned: "returned for correction",
}

const KIND_COPY: Record<EssRequestLifecycleKind, string> = {
  profile_update: "profile update request",
  document_request: "document request",
  policy_acknowledgement: "policy acknowledgement",
}

export async function notifyEssRequestLifecycle(input: {
  readonly organizationId: string
  readonly targetUserId: string
  readonly kind: EssRequestLifecycleKind
  readonly status: EssRequestLifecycleStatus
  readonly requestId: string
  readonly employeeId: string
}): Promise<void> {
  const kindLabel = KIND_COPY[input.kind]
  const statusLabel = STATUS_COPY[input.status]
  await publishOrgNotificationIfMissing({
    organizationId: input.organizationId,
    targetUserId: input.targetUserId,
    title: `Employee self-service ${statusLabel}`,
    body: `Your ${kindLabel} was ${statusLabel}.`,
    severity: input.status === "rejected" ? "warning" : "info",
    linkedEntityType: input.kind,
    linkedEntityId: input.requestId,
    linkedEntityLabel: kindLabel,
    linkedPath: "/employee/requests",
    expiresAt: null,
  })
}
