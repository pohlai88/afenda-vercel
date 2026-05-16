import { EmployeePortalClaimDetailPage } from "#features/hrm"

export const dynamic = "force-dynamic"

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
