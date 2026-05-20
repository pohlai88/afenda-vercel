export type DemoRouteStatus = "available" | "planned"

export type DemoRouteCategory =
  | "Human Resources"
  | "Procurement"
  | "Inventory"
  | "Accounting"
  | "Sales"
  | "Governance / Audit"
  | "Workbench"

export type DemoRouteManifestEntry = {
  slug: string
  category: DemoRouteCategory
  title: string
  teaches: string
  mirrors: string
  status: DemoRouteStatus
}

export const DEMO_ROUTE_MANIFEST: readonly DemoRouteManifestEntry[] = [
  {
    slug: "employee/leave",
    category: "Human Resources",
    title: "Employee Leave",
    teaches:
      "Review leave balances, inspect request history, and understand approval status.",
    mirrors: "/p/{portalSlug}/employee/leave",
    status: "available",
  },
  {
    slug: "hrm/employee-records",
    category: "Human Resources",
    title: "Employee Records",
    teaches:
      "Browse workforce records, placement, and master data completeness.",
    mirrors: "/o/{orgSlug}/apps/hrm/employees",
    status: "available",
  },
  {
    slug: "procurement/purchase-request",
    category: "Procurement",
    title: "Purchase Request",
    teaches: "Submit and track purchase requests through approval.",
    mirrors: "/o/{orgSlug}/apps/procurement/purchase-requests",
    status: "available",
  },
  {
    slug: "inventory/stock-movement",
    category: "Inventory",
    title: "Stock Movement",
    teaches: "Record and reconcile inventory movements.",
    mirrors: "/o/{orgSlug}/apps/inventory/stock-movements",
    status: "available",
  },
  {
    slug: "workbench/shell",
    category: "Workbench",
    title: "Workbench Shell",
    teaches: "Explore post-login utility bar, rails, and command affordances.",
    mirrors: "/playground/shell-preview (development only)",
    status: "available",
  },
] as const

export function listDemoRoutesByCategory(): ReadonlyArray<{
  category: DemoRouteCategory
  entries: readonly DemoRouteManifestEntry[]
}> {
  const categories = new Map<DemoRouteCategory, DemoRouteManifestEntry[]>()
  for (const entry of DEMO_ROUTE_MANIFEST) {
    const bucket = categories.get(entry.category) ?? []
    bucket.push(entry)
    categories.set(entry.category, bucket)
  }
  return [...categories.entries()].map(([category, entries]) => ({
    category,
    entries,
  }))
}

export function findDemoManifestEntry(
  slug: string
): DemoRouteManifestEntry | undefined {
  return DEMO_ROUTE_MANIFEST.find((entry) => entry.slug === slug)
}
