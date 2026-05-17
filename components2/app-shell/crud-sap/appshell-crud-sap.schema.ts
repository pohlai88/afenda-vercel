import {
  CRUD_SAP_META_VERBS,
  CRUD_SAP_TEMPORAL_FOCUS,
} from "#lib/erp/crud-sap.shared"

/**
 * Dev-shell toolbar verb order — Past → Now → Next → Meta.
 * Derived from {@link CRUD_SAP_TEMPORAL_FOCUS} so the strip stays aligned with ERP primitives.
 */
export const CRUD_SAP_VERB_IDS = [
  ...CRUD_SAP_TEMPORAL_FOCUS.past,
  ...CRUD_SAP_TEMPORAL_FOCUS.now,
  ...CRUD_SAP_TEMPORAL_FOCUS.next,
  ...CRUD_SAP_META_VERBS,
] as const

export type CrudSapVerbId = (typeof CRUD_SAP_VERB_IDS)[number]

export const CRUD_SAP_ORDER_STORAGE_KEY =
  "afenda-dev-shell-preview-crud-sap-order-v1"
