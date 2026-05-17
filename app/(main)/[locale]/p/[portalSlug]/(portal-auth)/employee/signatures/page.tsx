import { EmployeePortalSignaturesPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type EmployeePortalSignaturesRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalSignaturesRoute({
  params,
}: EmployeePortalSignaturesRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalSignaturesPage portalSlug={portalSlug} />
}
