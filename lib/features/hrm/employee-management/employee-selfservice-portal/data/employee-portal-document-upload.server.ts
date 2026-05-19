import "server-only"

import { getEmployeePortalContext } from "./employee-portal-access.server"

export async function canUploadPortalEmployeeDocument(input: {
  portalSlug: string
  organizationId: string
  employeeId: string
}): Promise<boolean> {
  const context = await getEmployeePortalContext(input.portalSlug)
  return Boolean(
    context &&
    context.portal.organizationId === input.organizationId &&
    context.employee.id === input.employeeId
  )
}
