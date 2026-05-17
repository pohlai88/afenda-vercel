import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

import type { SignatureEventType } from "../schemas/signature.schema"

export const SIGNATURE_EVENT_TO_AUDIT_ACTION: Record<
  SignatureEventType,
  string
> = {
  "signature_request.created": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "create",
  }),
  "signature_request.sent": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.opened": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.viewed": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "consent.presented": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "audit",
  }),
  "consent.accepted": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "audit",
  }),
  "signature_request.recipient_completed": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.completed": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.rejected": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.cancelled": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "deprecate",
  }),
  "signature_request.expired": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.reminder_sent": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.resent": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "update",
  }),
  "signature_request.seal_failed": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "audit",
  }),
  "signature_request.provider_callback": buildCrudSapAuditAction({
    area: "erp",
    module: "hrm",
    object: "signature",
    verb: "audit",
  }),
}

export function auditActionForSignatureEvent(
  eventType: SignatureEventType
): string {
  return SIGNATURE_EVENT_TO_AUDIT_ACTION[eventType]
}

/** Outbound webhook event names for org_event_delivery. */
export const SIGNATURE_EVENT_TO_WEBHOOK_EVENT: Record<
  SignatureEventType,
  string
> = {
  "signature_request.created": "signature_request.created",
  "signature_request.sent": "signature_request.sent",
  "signature_request.opened": "signature_request.opened",
  "signature_request.viewed": "signature_request.viewed",
  "consent.presented": "consent.presented",
  "consent.accepted": "consent.accepted",
  "signature_request.recipient_completed":
    "signature_request.recipient_completed",
  "signature_request.completed": "signature_request.completed",
  "signature_request.rejected": "signature_request.rejected",
  "signature_request.cancelled": "signature_request.cancelled",
  "signature_request.expired": "signature_request.expired",
  "signature_request.reminder_sent": "signature_request.reminder_sent",
  "signature_request.resent": "signature_request.resent",
  "signature_request.seal_failed": "signature_request.seal_failed",
  "signature_request.provider_callback": "signature_request.provider_callback",
}
