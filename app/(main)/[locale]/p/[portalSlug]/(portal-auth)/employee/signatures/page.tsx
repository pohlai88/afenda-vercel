import { EmployeePortalSignaturesPage } from "#features/hrm"


type EmployeePortalSignaturesRouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalSignaturesRoute({
  params,
}: EmployeePortalSignaturesRouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalSignaturesPage portalSlug={portalSlug} />
}
