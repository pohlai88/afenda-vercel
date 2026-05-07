/**
 * Deterministic IDs and copy for demos, Vitest expectations, and future Playwright / MSW wiring.
 * Do not use for production data — documentation and local bootstrap only.
 *
 * Emails match `components/dev/dev-signin-panel.tsx` dev shortcuts.
 */
export const DEV_SIGNIN_PRESET_EMAILS = {
  owner: "owner@afenda.com",
  erp: "erp@afenda.com",
} as const

export const BOOTSTRAP_FIXTURE = {
  organization: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Demo Organization",
    slug: "demo-org",
  },
  members: [
    {
      userId: "00000000-0000-4000-8000-000000000002",
      email: DEV_SIGNIN_PRESET_EMAILS.owner,
      name: "Demo Owner",
      role: "owner",
    },
    {
      userId: "00000000-0000-4000-8000-000000000003",
      email: DEV_SIGNIN_PRESET_EMAILS.erp,
      name: "Demo ERP",
      role: "member",
    },
  ],
} as const

/** Strings that match the current marketing shell (keep in sync with app pages). */
export const DEMO_PUBLIC_COPY = {
  homeHeading: "Project ready!",
  signInEmailLabel: "Email",
} as const
