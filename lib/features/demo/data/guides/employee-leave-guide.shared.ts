import type { DemoGuideContent } from "../../schemas/demo-guide.shared"

export const EMPLOYEE_LEAVE_DEMO_GUIDE = {
  title: "How to use Employee Leave",
  purpose:
    "Employees use this page to review leave balances, inspect request history, and understand approval state before submitting new requests.",
  steps: [
    {
      title: "Check balance first",
      description:
        "Review entitled, taken, pending, and available days for each leave type before creating a request.",
    },
    {
      title: "Read the request history",
      description:
        "Use the status column to see whether leave is submitted, approved, rejected, or cancelled.",
    },
    {
      title: "Use evidence when needed",
      description:
        "In production, approved requests are linked to audit and approval evidence for compliance review.",
    },
  ],
  productionActions: [
    "Submit a new leave request",
    "Cancel eligible pending requests",
    "View approval evidence",
  ],
  demoLimitations: [
    "This public demo is read-only.",
    "No real employee data is shown.",
    "No request is submitted from this page.",
  ],
} as const satisfies DemoGuideContent
