import type { ReactNode } from "react"

import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"

export default async function OrgAppsOrbitLayout({
  children,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const allowed = await canUseErpPermissionForCurrentOrg({
    module: "planner",
    object: "workspace",
    function: "search",
  })
  if (!allowed) {
    return (
      <ErpAccessDenied
        title="Orbit"
        description="This surface requires an ERP role with Orbit search access."
      />
    )
  }

  return (
    <>
      {children}
    </>
  )
}
