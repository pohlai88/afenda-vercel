"use server"

import { redirect } from "next/navigation"

import { auth } from "#lib/auth-v2"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"

export type SignUpState = { error: string } | null

export async function signUpWithEmail(
  locale: string,
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const appLocale = ensureAppLocale(locale)
  const email = String(formData.get("email") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !name || !password) {
    return { error: "Name, email, and password are required." }
  }

  const { error } = await auth.signUp.email({ email, name, password })
  if (error) {
    return { error: error.message || "Failed to create account." }
  }

  redirect(toLocalePath(appLocale, "/check-email"))
}
