import { composeDemoRoutePage } from "./demo-route-page-compose.server"
import { WORKBENCH_SHELL_DEMO_GUIDE } from "../data/guides/workbench-shell-guide.shared"
import { generateDemoRouteMetadata } from "../data/demo-route-metadata.server"

import { DemoWorkbenchShellOverview } from "./demo-workbench-shell-overview.server"

export async function generateDemoWorkbenchShellMetadata() {
  return generateDemoRouteMetadata("workbench/shell", "workbenchShellPageDescription")
}

export default async function DemoWorkbenchShellPage() {
  return composeDemoRoutePage({
    slug: "workbench/shell",
    descriptionKey: "workbenchShellPageDescription",
    guide: WORKBENCH_SHELL_DEMO_GUIDE,
    mirrorsFallback: "/playground/shell-preview (development only)",
    main: <DemoWorkbenchShellOverview />,
  })
}
