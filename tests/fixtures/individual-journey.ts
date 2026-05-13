/**
 * Copy and env contract for individual sign-up journeys (Playwright + docs).
 * Sign-up UI strings align with `messages/en.json` (`Auth.*` / `CheckEmail.*`).
 */
export const SIGN_UP_PAGE_COPY = {
  heading: "Create account",
  nameLabel: "Name",
  emailLabel: "Email",
  passwordLabel: "Password",
  submitIdle: "Create account",
  submitPending: "Please wait…",
  signInLink: "Sign in",
} as const

export const CHECK_EMAIL_PAGE_COPY = {
  heading: "Check your email",
  verifyCta: "Enter verification code",
} as const
