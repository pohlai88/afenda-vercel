/**
 * Vietnam e-invoice module — audit strings and stable resource types.
 */
export const ERP_VIETNAM_EINVOICE_MODULE_ID = "erp-vietnam-einvoice" as const

export const EINVOICE_AUDIT_ACTIONS = {
  INVOICE_CREATE: "erp.einvoice.invoice.create",
} as const

export type EinvoiceAuditAction =
  (typeof EINVOICE_AUDIT_ACTIONS)[keyof typeof EINVOICE_AUDIT_ACTIONS]
