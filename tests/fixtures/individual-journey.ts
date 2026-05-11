/**
 * Copy and env contract for individual sign-up journeys (Playwright + docs).
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
