"use server"

import { redirect } from "next/navigation"

import { auth } from "#lib/auth"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export type VerifyEmailState = { error: string } | null

export async function verifyEmailOtp(
  locale: string,
  _prevState: VerifyEmailState,
  formData: FormData
): Promise<VerifyEmailState> {
  const appLocale = ensureAppLocale(locale)
  const email = String(formData.get("email") ?? "").trim()
  const otp = String(formData.get("otp") ?? "").trim()
  if (!email || !otp) {
    return { error: "Email and code are required." }
  }

  const { error } = await auth.emailOtp.verifyEmail({ email, otp })
  if (error) return { error: error.message || "Failed to verify email." }

  const signedIn = await auth.signIn.emailOtp({ email, otp })
  if (signedIn.error) {
    return {
      error:
        signedIn.error.message || "Verification succeeded, sign-in failed.",
    }
  }

  redirect(toLocalePath(appLocale, "/account"))
}
