import { EmployeePortalDocumentsPage } from "#features/hrm"

export const dynamic = "force-dynamic"

type RouteProps = {
  params: Promise<{ portalSlug: string }>
}

export default async function EmployeePortalDocumentsRoute({
  params,
}: RouteProps) {
  const { portalSlug } = await params
  return <EmployeePortalDocumentsPage portalSlug={portalSlug} />
}
