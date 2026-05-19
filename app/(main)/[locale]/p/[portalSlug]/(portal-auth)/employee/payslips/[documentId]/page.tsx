import { EmployeePortalPayslipDetailPage } from "#features/hrm"

type EmployeePortalPayslipDetailRouteProps = {
  params: Promise<{ portalSlug: string; documentId: string }>
}

export default async function EmployeePortalPayslipDetailRoute({
  params,
}: EmployeePortalPayslipDetailRouteProps) {
  const { portalSlug, documentId } = await params

  return (
    <EmployeePortalPayslipDetailPage
      portalSlug={portalSlug}
      documentId={documentId}
    />
  )
}
