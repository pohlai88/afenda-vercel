import type {
  ErpFunction,
  ErpPermissionDefinition,
  ErpPermissionKey,
  ErpPermissionTuple,
} from "./types"

function buildPermissionSet(input: {
  module: string
  object: string
  label: string
  sensitivity?: ErpPermissionDefinition["sensitivity"]
  routeUse?: ErpPermissionDefinition["routeUse"]
  functions?: readonly ErpFunction[]
}): ErpPermissionDefinition[] {
  const functions =
    input.functions ??
    ([
      "create",
      "read",
      "update",
      "delete",
      "search",
      "audit",
      "predict",
    ] as const satisfies readonly ErpFunction[])

  return functions.map((fn) => ({
    key: buildErpPermissionKey({
      module: input.module,
      object: input.object,
      function: fn,
    }),
    module: input.module,
    object: input.object,
    function: fn,
    label: `${input.label} · ${fn}`,
    sensitivity: input.sensitivity ?? "standard",
    routeUse: input.routeUse ?? "both",
  }))
}

export function buildErpPermissionKey(
  input: ErpPermissionTuple
): ErpPermissionKey {
  return `${input.module}.${input.object}.${input.function}` as ErpPermissionKey
}

export const ERP_PERMISSION_REGISTRY = [
  ...buildPermissionSet({
    module: "contacts",
    object: "record",
    label: "Contacts",
  }),
  ...buildPermissionSet({
    module: "knowledge",
    object: "chunk",
    label: "Knowledge chunks",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "knowledge",
    object: "source",
    label: "Knowledge sources",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "knowledge",
    object: "credential",
    label: "Knowledge credentials",
    sensitivity: "restricted",
  }),
  ...buildPermissionSet({
    module: "knowledge",
    object: "settings",
    label: "Knowledge settings",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "knowledge",
    object: "evaluation",
    label: "Knowledge evaluations",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "knowledge",
    object: "bot_link",
    label: "Knowledge bot links",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "lynx",
    object: "workspace",
    label: "Lynx workspace",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "planner",
    object: "workspace",
    label: "Orbit workspace",
  }),
  ...buildPermissionSet({
    module: "planner",
    object: "notice",
    label: "Orbit notices",
  }),
  ...buildPermissionSet({
    module: "accounting",
    object: "entry",
    label: "Accounting entries",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "inventory",
    object: "stock",
    label: "Inventory stock",
  }),
  ...buildPermissionSet({
    module: "purchase",
    object: "order",
    label: "Purchase orders",
  }),
  ...buildPermissionSet({
    module: "sale",
    object: "order",
    label: "Sales orders",
  }),
  ...buildPermissionSet({
    module: "einvoice",
    object: "invoice",
    label: "Vietnam e-invoices",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "employee",
    label: "HRM workforce",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "organization",
    label: "HRM organization",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "onboarding",
    label: "HRM onboarding",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "leave",
    label: "HRM leave",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "attendance",
    label: "HRM attendance",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "benefit",
    label: "HRM benefits",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "claim",
    label: "HRM claims",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "payroll",
    label: "HRM payroll",
    sensitivity: "restricted",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "performance",
    label: "HRM performance",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "kpi",
    label: "HRM KPI",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "salary_advance",
    label: "HRM salary advances",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "compliance",
    label: "HRM compliance",
    sensitivity: "restricted",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "document",
    label: "HRM documents",
    sensitivity: "restricted",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "policy",
    label: "HRM policies",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "snapshot",
    label: "HRM snapshot",
    sensitivity: "sensitive",
  }),
  ...buildPermissionSet({
    module: "hrm",
    object: "recruitment",
    label: "HRM recruitment",
    sensitivity: "sensitive",
  }),
] as const satisfies readonly ErpPermissionDefinition[]

export const ERP_PERMISSION_REGISTRY_BY_KEY = new Map<
  ErpPermissionKey,
  ErpPermissionDefinition
>(ERP_PERMISSION_REGISTRY.map((permission) => [permission.key, permission]))

export function getErpPermissionDefinition(
  key: string
): ErpPermissionDefinition | null {
  return ERP_PERMISSION_REGISTRY_BY_KEY.get(key as ErpPermissionKey) ?? null
}

export function isKnownErpPermissionKey(
  value: string
): value is ErpPermissionKey {
  return ERP_PERMISSION_REGISTRY_BY_KEY.has(value as ErpPermissionKey)
}
