/**
 * Deterministic IDs and copy for demos, Vitest expectations, and future Playwright / MSW wiring.
 * Do not use for production data — documentation and local bootstrap only.
 */
export const BOOTSTRAP_FIXTURE = {
  organization: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Demo Organization",
    slug: "demo-org",
  },
  members: [
    {
      userId: "00000000-0000-4000-8000-000000000002",
      email: "owner@example.com",
      name: "Demo Owner",
      role: "owner",
    },
    {
      userId: "00000000-0000-4000-8000-000000000003",
      email: "member@example.com",
      name: "Demo Member",
      role: "member",
    },
  ],
} as const

/** Strings that match the current marketing shell (keep in sync with app pages). */
export const DEMO_PUBLIC_COPY = {
  homeHeading: "Project ready!",
  signInEmailLabel: "Email",
} as const
