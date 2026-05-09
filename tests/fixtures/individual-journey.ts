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

/** Keys under `Dashboard.OneThing` in `messages/en.json` — keep aligned for assertions. */
export const PERSONAL_ONETHING_COPY = {
  pageTitle: "Personal tasks",
  addSection: "Add task",
  titleLabel: "Title",
  markComplete: "Mark complete",
} as const
