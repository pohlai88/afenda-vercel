/**
 * Copy for pre-sign-in auth routes Playwright specs.
 * Align with:
 * - `app/[locale]/(auth)/forgot-password/forgot-password-form.tsx`
 * - `app/[locale]/(auth)/reset-password/reset-password-form.tsx`
 * - `messages/en.json` → `Auth.*` + `VerifyEmail.*`
 *
 * Full password-reset E2E (email link + token) needs a mail sink or auth test API — not in CI; see `AGENTS.md` testing contract.
 */
export const AUTH_PUBLIC_SHELL_COPY = {
  forgotPasswordTitle: "Forgot password",
  forgotPasswordSend: "Send reset link",
  forgotPasswordBackToSignIn: "Back to sign in",
  resetPasswordTitle: "Set a new password",
  resetPasswordSubmit: "Update password",
  resetMissingTokenAlert:
    "Missing reset token. Open the link from your email again.",
  verifyEmailHeading: "Verify email",
  verifyEmailSubmit: "Verify and continue",
  verifyEmailResend: "Resend code",
  /** `Auth.tabSignUp` */
  signInTabSignUp: "Create account",
  /** `Auth.labelName` — visible after switching to Sign up tab */
  signUpNameLabel: "Name",
} as const
