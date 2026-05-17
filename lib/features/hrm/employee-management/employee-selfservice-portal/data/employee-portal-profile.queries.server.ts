import "server-only"

import { getEmployeeMasterRecordForOrganization } from "../../employee-records-management/data/employee-master.queries.server"
import { maskEmployeeMasterSnapshotSensitiveFields } from "../../employee-records-management/data/employee-master-sensitive-view.shared"

export async function getEmployeePortalProfileSnapshot(input: {
  readonly organizationId: string
  readonly employeeId: string
}) {
  const snapshot = await getEmployeeMasterRecordForOrganization({
    organizationId: input.organizationId,
    employeeId: input.employeeId,
  })

  return snapshot
    ? maskEmployeeMasterSnapshotSensitiveFields(snapshot, {
        canReadSensitive: false,
      })
    : null
}
