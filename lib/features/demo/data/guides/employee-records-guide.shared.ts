import type { DemoGuideContent } from "../../schemas/demo-guide.shared"

export const EMPLOYEE_RECORDS_DEMO_GUIDE = {
  title: "How to use Employee Records",
  purpose:
    "HR operators browse the workforce directory, open employee profiles, and monitor master-data completeness before hiring or offboarding workflows.",
  steps: [
    {
      title: "Scan the workforce table",
      description:
        "Use employee number, display name, email, and status to locate people quickly.",
    },
    {
      title: "Open a profile",
      description:
        "In production, row links open the employee detail surface with placement, contracts, and compliance sections.",
    },
    {
      title: "Check permissions",
      description:
        "Create and update actions are gated by ERP RBAC — members may see read-only views.",
    },
  ],
  productionActions: [
    "Add employee",
    "Update master data",
    "View change history and document vault",
  ],
  demoLimitations: [
    "This public demo is read-only.",
    "Row links use a fixture org slug — they do not open a live tenant.",
    "No mutations run from this page.",
  ],
} as const satisfies DemoGuideContent
