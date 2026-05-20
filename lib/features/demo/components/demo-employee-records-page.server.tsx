import { composeDemoRoutePage } from "./demo-route-page-compose.server"
import { EMPLOYEE_RECORDS_DEMO_GUIDE } from "../data/guides/employee-records-guide.shared"
import { generateDemoRouteMetadata } from "../data/demo-route-metadata.server"

import { DemoEmployeeRecordsReadOnlySurface } from "./demo-employee-records-readonly-surface.server"

export async function generateDemoEmployeeRecordsMetadata() {
  return generateDemoRouteMetadata(
    "hrm/employee-records",
    "employeeRecordsPageDescription"
  )
}

export default async function DemoEmployeeRecordsPage() {
  return composeDemoRoutePage({
    slug: "hrm/employee-records",
    descriptionKey: "employeeRecordsPageDescription",
    guide: EMPLOYEE_RECORDS_DEMO_GUIDE,
    mirrorsFallback: "/o/{orgSlug}/apps/hrm/employees",
    main: <DemoEmployeeRecordsReadOnlySurface />,
  })
}
