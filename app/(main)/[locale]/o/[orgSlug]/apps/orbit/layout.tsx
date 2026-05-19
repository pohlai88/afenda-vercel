import type { ReactNode } from "react"

import { ErpAccessDenied } from "#features/erp-rbac/client"
import { canUseErpPermissionForCurrentOrg } from "#features/erp-rbac/server"
import { OrbitCommandLayer } from "#features/planner/server"

export default async function OrgAppsOrbitLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ orgSlug: string }>
}) {
  const { orgSlug } = await params
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
      <OrbitCommandLayer orgSlug={orgSlug} />
    </>
  )
}
