import { EmployeePortalSignatureCeremonyPage } from "#features/hrm"

type EmployeePortalSignatureCeremonyRouteProps = {
  params: Promise<{ portalSlug: string; token: string }>
}

export default async function EmployeePortalSignatureCeremonyRoute({
  params,
}: EmployeePortalSignatureCeremonyRouteProps) {
  const { portalSlug, token } = await params
  return (
    <EmployeePortalSignatureCeremonyPage
      portalSlug={portalSlug}
      partyToken={token}
    />
  )
}
