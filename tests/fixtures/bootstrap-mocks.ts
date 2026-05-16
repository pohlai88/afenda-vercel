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

/**
 * Primary employee portal slug for {@link BOOTSTRAP_FIXTURE.organization}
 * (`buildEmployeePortalSlugCandidates` → `{orgSlug}-employee`).
 * Align with `E2E_EMPLOYEE_PORTAL_SLUG` in `.env.config`.
 */
export const DEMO_EMPLOYEE_PORTAL_SLUG = "demo-org-employee" as const

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

/**
 * Org admin audit UI — keep aligned with `messages/en.json` (`OrgAdmin.audit`).
 * Playwright specs assert user-visible strings from here (single source in tests).
 */
export const ORG_ADMIN_AUDIT_E2E_COPY = {
  pageHeading: "Organization audit",
  /** `OrgAdmin.audit.events.viewAria` */
  originFilterNavAria: "Audit row origin filter",
  viewProduction: "Production",
  viewSimulated: "Simulated",
  viewAll: "All",
  /** `OrgAdmin.audit.events.headerOrigin` */
  tableHeaderOrigin: "Origin",
} as const

/** Substring of streamed org IAM audit CSV header (includes simulation provenance columns). */
export const ORG_AUDIT_CSV_HEADER_PROVENANCE_SNIPPET =
  "audit_origin,simulation_run_id,scenario_id,scenario_version,audit_actor_mode"
