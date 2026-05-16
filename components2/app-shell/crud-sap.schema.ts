export const CRUD_SAP_VERB_IDS = [
  "search",
  "audit",
  "resolve",
  "update",
  "create",
  "predict",
  "deprecate",
] as const

export type CrudSapVerbId = (typeof CRUD_SAP_VERB_IDS)[number]

export const CRUD_SAP_ORDER_STORAGE_KEY =
  "afenda-dev-shell-preview-crud-sap-order-v1"
