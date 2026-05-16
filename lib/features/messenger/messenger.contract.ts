import { buildCrudSapAuditAction } from "#lib/erp/crud-sap.shared"

export const MESSENGER_AUDIT_ACTIONS = {
  roomCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "messenger",
    object: "room",
    verb: "create",
  }),
  messageCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "messenger",
    object: "message",
    verb: "create",
  }),
  memberCreate: buildCrudSapAuditAction({
    area: "erp",
    module: "messenger",
    object: "member",
    verb: "create",
  }),
} as const
