import "server-only"

import { getEmployeeMasterRecordForOrganization } from "./employee-master.queries.server"

export async function getEmployeePortalProfileSnapshot(input: {
  readonly organizationId: string
  readonly employeeId: string
}) {
  return getEmployeeMasterRecordForOrganization({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
  })
}
