import type { DemoGuideContent } from "../../schemas/demo-guide.shared"

export const PROCUREMENT_PURCHASE_REQUEST_DEMO_GUIDE = {
  title: "How to use Purchase Requests",
  purpose:
    "Requesters submit spend needs, route them through approval, and track status before procurement converts approved lines to purchase orders.",
  steps: [
    {
      title: "Create or draft a request",
      description:
        "Capture line items, cost center, and justification while the request is still editable.",
    },
    {
      title: "Submit for approval",
      description:
        "Approvers see amount, requester, and policy hints in the governed list and detail surfaces.",
    },
    {
      title: "Track status",
      description:
        "Draft, pending, approved, and rejected states drive which actions appear in the trailing column.",
    },
  ],
  productionActions: [
    "Submit purchase request",
    "Approve or reject",
    "Convert to purchase order",
  ],
  demoLimitations: [
    "Procurement ERP routes are not shipped yet — this demo uses fixture rows only.",
    "Read-only — no approval or posting from the showcase.",
  ],
} as const satisfies DemoGuideContent
