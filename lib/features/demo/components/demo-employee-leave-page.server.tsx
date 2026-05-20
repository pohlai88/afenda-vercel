import { EMPLOYEE_LEAVE_DEMO_GUIDE } from "../data/guides/employee-leave-guide.shared"
import { getDemoEmployeeLeaveFixture } from "../data/demo-employee-leave.fixture.server"
import { generateDemoRouteMetadata } from "../data/demo-route-metadata.server"

import { composeDemoRoutePage } from "./demo-route-page-compose.server"
import { DemoEmployeeLeaveReadOnlySurface } from "./demo-employee-leave-readonly-surface.server"

export async function generateDemoEmployeeLeaveMetadata() {
  return generateDemoRouteMetadata("employee/leave", "leavePageDescription")
}

export default async function DemoEmployeeLeavePage() {
  const fixture = getDemoEmployeeLeaveFixture()

  return composeDemoRoutePage({
    slug: "employee/leave",
    descriptionKey: "leavePageDescription",
    guide: EMPLOYEE_LEAVE_DEMO_GUIDE,
    mirrorsFallback: "/p/{portalSlug}/employee/leave",
    main: <DemoEmployeeLeaveReadOnlySurface fixture={fixture} />,
  })
}
