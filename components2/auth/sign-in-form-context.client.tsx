"use client"

import type { Route } from "next"
import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "#i18n/navigation"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
  type NormalizedAuthClientError,
} from "#lib/auth-client"
import { neonAuthClient } from "#lib/auth/neon-auth-client-runtime.shared"
import {
  localeAwarePathToClientRoute,
  resolvePostSignUpPath,
} from "#lib/auth/auth-flow.shared"

import type {
  SignInFormActionPending,
  SignInFormAuthKind,
  SignInFormMode,
} from "./sign-in-form.types.shared"

type SignInFormContextValue = {
  mode: SignInFormMode
  setMode: (mode: SignInFormMode) => void
  kind: SignInFormAuthKind
  setKind: (kind: SignInFormAuthKind) => void
  email: string
  setEmail: (value: string) => void
  password: string
  setPassword: (value: string) => void
  name: string
  setName: (value: string) => void
  otp: string
  setOtp: (value: string) => void
  authError: NormalizedAuthClientError | null
  authErrorDescId: string
  info: string | null
  pending: SignInFormActionPending
  busy: boolean
  stepUp: boolean
  lockMode: boolean
  enabledSocialProviders: string[]
  focusFieldForMode: (
    nextMode: SignInFormMode,
    nextKind: SignInFormAuthKind
  ) => void
  onSubmit: (e: React.FormEvent) => void
  onOAuth: (provider: "google" | "github") => void | Promise<void>
}

const SignInFormContext = createContext<SignInFormContextValue | null>(null)

export function useSignInForm() {
  const ctx = useContext(SignInFormContext)
  if (!ctx) {
    throw new Error("useSignInForm must be used within SignInFormProvider")
  }
  return ctx
}

export function SignInFormProvider({
  children,
  postAuthPath,
  stepUp = false,
  initialEmail,
  enabledSocialProviders,
  initialMode = "sign-in",
  lockMode = false,
}: {
  children: ReactNode
  postAuthPath: string
  stepUp?: boolean
  initialEmail?: string
  enabledSocialProviders: string[]
  initialMode?: SignInFormMode
  lockMode?: boolean
}) {
  const t = useTranslations("Auth")
  const router = useRouter()
  const authErrorRegionId = useId()
  const authErrorDescId = `${authErrorRegionId}-desc`
  const [email, setEmail] = useState(initialEmail ?? "")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [mode, setMode] = useState<SignInFormMode>(initialMode)
  const [kind, setKind] = useState<SignInFormAuthKind>("password")
  const [authError, setAuthError] = useState<NormalizedAuthClientError | null>(
    null
  )
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState<SignInFormActionPending>(null)

  const busy = pending !== null

  function focusFieldForMode(
    nextMode: SignInFormMode,
    nextKind: SignInFormAuthKind
  ) {
    queueMicrotask(() => {
      if (nextKind === "password") {
        document.getElementById(`password-${nextMode}`)?.focus()
      } else {
        document.getElementById(`email-${nextMode}`)?.focus()
      }
    })
  }

  function goPostAuth() {
    router.push(localeAwarePathToClientRoute(postAuthPath) as Route)
    router.refresh()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setInfo(null)
    setPending("form")
    try {
      if (kind === "otp") {
        if (mode !== "sign-in") {
          setAuthError({
            code: AUTH_CLIENT_ERROR_CODE.UNKNOWN,
            message:
              "Email-code account creation is not available here. Use password sign-up instead.",
            fieldHint: "general",
          })
          return
        }
        if (otp.trim()) {
          const { error: err } = await neonAuthClient.signIn.emailOtp({
            email,
            otp: otp.trim(),
          })
          if (err) {
            setAuthError(normalizeAuthClientError(err.message))
            return
          }
          goPostAuth()
          return
        }
        const { error: err } =
          await neonAuthClient.emailOtp.sendVerificationOtp({
            email,
            type: "sign-in",
          })
        if (err) {
          setAuthError(normalizeAuthClientError(err.message))
          return
        }
        setInfo(t("infoOtpCode"))
        return
      }
      if (mode === "sign-up") {
        const result = await neonAuthClient.signUp.email({
          email,
          password,
          name,
          callbackURL: postAuthPath,
        })
        const err = result.error
        if (err) {
          setAuthError(normalizeAuthClientError(err.message))
          return
        }
        router.push(
          localeAwarePathToClientRoute(
            resolvePostSignUpPath(result, {
              email,
              postAuthPath,
            })
          ) as Route
        )
        router.refresh()
        return
      }
      const { error: err } = await neonAuthClient.signIn.email({
        email,
        password,
        callbackURL: postAuthPath,
      })
      if (err) {
        setAuthError(normalizeAuthClientError(err.message))
        return
      }
      goPostAuth()
    } catch (caught: unknown) {
      const msg = caught instanceof Error ? caught.message : undefined
      setAuthError(normalizeAuthClientError(msg))
    } finally {
      setPending(null)
    }
  }

  async function onOAuth(provider: "google" | "github") {
    setAuthError(null)
    setInfo(null)
    setPending(provider === "google" ? "oauth-google" : "oauth-github")
    try {
      await neonAuthClient.signIn.social({
        provider,
        callbackURL: postAuthPath,
      })
    } catch (caught: unknown) {
      const msg = caught instanceof Error ? caught.message : undefined
      setAuthError(normalizeAuthClientError(msg))
    } finally {
      setPending(null)
    }
  }

  return (
    <SignInFormContext.Provider
      value={{
        mode,
        setMode,
        kind,
        setKind,
        email,
        setEmail,
        password,
        setPassword,
        name,
        setName,
        otp,
        setOtp,
        authError,
        authErrorDescId,
        info,
        pending,
        busy,
        stepUp,
        lockMode,
        enabledSocialProviders,
        focusFieldForMode,
        onSubmit,
        onOAuth,
      }}
    >
      {children}
    </SignInFormContext.Provider>
  )
}
