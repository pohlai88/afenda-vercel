/**
 * Copy and env contract for individual sign-up → personal onething journeys (Playwright + docs).
 * Sign-up UI strings match `app/[locale]/(auth)/sign-up/sign-up-form.tsx` (hardcoded English).
 */
export const SIGN_UP_PAGE_COPY = {
  heading: "Create account",
  nameLabel: "Your name",
  emailLabel: "Email",
  passwordLabel: "Password",
  submitIdle: "Create account",
  submitPending: "Creating…",
  signInLink: "Sign in",
} as const

export const CHECK_EMAIL_PAGE_COPY = {
  heading: "Check your email",
  verifyCta: "Enter verification code",
} as const

/**
 * Personal OneThing (`/account/onething`) — strings from `Dashboard.OneThing` in
 * `messages/en.json` (`shell.*`, `toolbar.resolve`). Not a separate page title;
 * the queue is a `nav` landmark.
 */
export const PERSONAL_ONETHING_COPY = {
  /** `Dashboard.OneThing.shell.listLabel` */
  operationalQueueNav: "Operational queue",
  /** `Dashboard.OneThing.shell.composerPlaceholder` (composer `aria-label`) */
  composerAriaLabel:
    'Capture the situation. (e.g. "Vendor payment blocked for three organizations")',
  /** `Dashboard.OneThing.shell.composerSubmit` */
  captureSubmit: "Capture",
  /** `Dashboard.OneThing.toolbar.resolve` — fast-resolve when severity is low */
  resolve: "Resolve",
} as const
