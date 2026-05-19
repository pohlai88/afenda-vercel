import { EmployeePortalClaimDetailPage } from "#features/hrm"

type RouteProps = {
  params: Promise<{ portalSlug: string; claimId: string }>
}

export default async function EmployeePortalClaimDetailRoute({
  params,
}: RouteProps) {
  const { portalSlug, claimId } = await params
  return (
    <EmployeePortalClaimDetailPage portalSlug={portalSlug} claimId={claimId} />
  )
}
