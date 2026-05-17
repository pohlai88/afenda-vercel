"use client"

import type { Route } from "next"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Link, useRouter } from "#i18n/navigation"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
  type NormalizedAuthClientError,
} from "#lib/auth-client"
import { neonAuthClient } from "#lib/auth-client-neon-compat"
import { AuthLegalConsent } from "#components2/auth/auth-legal-consent"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "#components2/ui/input-otp"
import { Label } from "#components2/ui/label"
import { Separator } from "#components2/ui/separator"
import { Spinner } from "#components2/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components2/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "#components2/ui/toggle-group"
import { cn } from "#lib/utils"

import {
  localeAwarePathToClientRoute,
  resolvePostSignUpPath,
} from "./auth-flow.shared"

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="fill-foreground"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

type Mode = "sign-in" | "sign-up"
type AuthKind = "password" | "otp"

type AuthActionPending = null | "form" | "oauth-google" | "oauth-github"

function SubmitLabel({
  busy,
  idle,
  waitingLabel,
  icon,
}: {
  busy: boolean
  idle: React.ReactNode
  waitingLabel: string
  icon?: React.ReactNode
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {busy ? <Spinner className="size-4" /> : (icon ?? null)}
      {busy ? waitingLabel : idle}
    </span>
  )
}

export function SignInForm({
  postAuthPath,
  stepUp = false,
  initialEmail,
  enabledSocialProviders,
  initialMode = "sign-in",
}: {
  postAuthPath: string
  stepUp?: boolean
  /** Optional sign-in page `?email=` prefill (e.g. dev shortcuts). */
  initialEmail?: string
  enabledSocialProviders: string[]
  initialMode?: Mode
}) {
  const t = useTranslations("Auth")
  const router = useRouter()
  const authErrorRegionId = useId()
  const authErrorDescId = `${authErrorRegionId}-desc`
  const [email, setEmail] = useState(initialEmail ?? "")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [mode, setMode] = useState<Mode>(initialMode)
  const [kind, setKind] = useState<AuthKind>("password")
  const [authError, setAuthError] = useState<NormalizedAuthClientError | null>(
    null
  )
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState<AuthActionPending>(null)

  const busy = pending !== null

  function focusFieldForMode(nextMode: Mode, nextKind: AuthKind) {
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
      } else {
        const { error: err } = await neonAuthClient.signIn.email({
          email,
          password,
          callbackURL: postAuthPath,
        })
        if (err) {
          setAuthError(normalizeAuthClientError(err.message))
          return
        }
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
    <Card
      className="w-full border-border/80 shadow-elevation-1"
      aria-busy={busy}
    >
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="text-xl tracking-tight">
          {mode === "sign-in" ? t("titleSignIn") : t("titleSignUp")}
        </CardTitle>
        <CardDescription>
          {stepUp ? t("descriptionStepUp") : t("descriptionDefault")}
        </CardDescription>
        {stepUp ? (
          <Alert variant="default" className="mt-3" role="status">
            <AlertTitle>{t("stepUpAlertTitle")}</AlertTitle>
            <AlertDescription>{t("stepUpAlertDescription")}</AlertDescription>
          </Alert>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            if (busy) return
            const nextMode = v as Mode
            setMode(nextMode)
            if (nextMode === "sign-up") {
              setKind("password")
            }
            setAuthError(null)
            setInfo(null)
            setOtp("")
            focusFieldForMode(nextMode, kind)
          }}
        >
          <TabsList className="grid h-10 w-full grid-cols-2">
            <TabsTrigger value="sign-in" disabled={busy}>
              {t("tabSignIn")}
            </TabsTrigger>
            <TabsTrigger value="sign-up" disabled={busy}>
              {t("tabSignUp")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="sign-in" className="mt-4 space-y-6 outline-none">
            <AuthMethodPanels
              kind={kind}
              setKind={(next) => {
                setKind(next)
                setOtp("")
                focusFieldForMode("sign-in", next)
              }}
              mode="sign-in"
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              setName={setName}
              otp={otp}
              setOtp={setOtp}
              authError={authError}
              authErrorDescId={authErrorDescId}
              info={info}
              pending={pending}
              busy={busy}
              enabledSocialProviders={enabledSocialProviders}
              onSubmit={onSubmit}
              onOAuth={onOAuth}
            />
          </TabsContent>
          <TabsContent value="sign-up" className="mt-4 space-y-6 outline-none">
            <AuthMethodPanels
              kind="password"
              setKind={(next) => {
                setKind(next)
                setOtp("")
                focusFieldForMode("sign-up", next)
              }}
              mode="sign-up"
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              name={name}
              setName={setName}
              otp={otp}
              setOtp={setOtp}
              authError={authError}
              authErrorDescId={authErrorDescId}
              info={info}
              pending={pending}
              busy={busy}
              enabledSocialProviders={enabledSocialProviders}
              onSubmit={onSubmit}
              onOAuth={onOAuth}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t pt-6">
        <AuthLegalConsent />
        <p className="text-center text-xs text-muted-foreground">
          <Link
            href={"/account/security" as Route}
            className="font-medium underline-offset-4 hover:text-foreground"
          >
            {t("footerSecurity")}
          </Link>
          {" · "}
          <Link
            href="/"
            className="font-medium underline-offset-4 hover:text-foreground"
          >
            {t("footerHome")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

function AuthMethodPanels({
  kind,
  setKind,
  mode,
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
  enabledSocialProviders,
  onSubmit,
  onOAuth,
}: {
  kind: AuthKind
  setKind: (k: AuthKind) => void
  mode: Mode
  email: string
  setEmail: (v: string) => void
  password: string
  setPassword: (v: string) => void
  name: string
  setName: (v: string) => void
  otp: string
  setOtp: (v: string) => void
  authError: NormalizedAuthClientError | null
  authErrorDescId: string
  info: string | null
  pending: AuthActionPending
  busy: boolean
  enabledSocialProviders: string[]
  onSubmit: (e: React.FormEvent) => void
  onOAuth: (provider: "google" | "github") => void | Promise<void>
}) {
  const tm = useTranslations("Auth")
  const hasSocial = enabledSocialProviders.length > 0
  const allowOtp = mode === "sign-in"
  const passwordReqsId = `${useId()}-password-reqs`
  const [showPassword, setShowPassword] = useState(false)
  const [capsWarning, setCapsWarning] = useState(false)

  const hint = authError?.fieldHint
  const errCode = authError?.code
  const emailInvalid = Boolean(authError && hint === "email")
  const passwordInvalid = Boolean(authError && hint === "password")
  const otpInvalid = Boolean(authError && hint === "otp")
  const nameInvalid = Boolean(
    authError &&
    mode === "sign-up" &&
    hint === "general" &&
    errCode !== AUTH_CLIENT_ERROR_CODE.MFA_REQUIRED
  )

  const passwordAriaDescribedBy = [
    passwordInvalid ? authErrorDescId : null,
    mode === "sign-up" ? passwordReqsId : null,
  ].filter((x): x is string => Boolean(x))
  const passwordAriaDescribedByAttr =
    passwordAriaDescribedBy.length > 0
      ? passwordAriaDescribedBy.join(" ")
      : undefined

  return (
    <>
      {hasSocial ? (
        <section aria-label={tm("ariaSsoSection")} className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {tm("ssoSectionLabelSocial")}
          </p>
          <div className="flex gap-2">
            {enabledSocialProviders.includes("google") ? (
              <Button
                type="button"
                variant="secondary"
                className="min-w-0 flex-1"
                disabled={busy}
                onClick={() => void onOAuth("google")}
              >
                <SubmitLabel
                  busy={pending === "oauth-google"}
                  idle={tm("oauthGoogleShort")}
                  waitingLabel={tm("pleaseWait")}
                  icon={<GoogleIcon />}
                />
              </Button>
            ) : null}
            {enabledSocialProviders.includes("github") ? (
              <Button
                type="button"
                variant="secondary"
                className="min-w-0 flex-1"
                disabled={busy}
                onClick={() => void onOAuth("github")}
              >
                <SubmitLabel
                  busy={pending === "oauth-github"}
                  idle={tm("oauthGithubShort")}
                  waitingLabel={tm("pleaseWait")}
                  icon={<GitHubIcon />}
                />
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Separator className="flex-1" />
            <span className="shrink-0">{tm("separatorOrEmail")}</span>
            <Separator className="flex-1" />
          </div>
        </section>
      ) : null}

      {allowOtp ? (
        <section aria-label={tm("ariaEmailSection")} className="space-y-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {tm("emailMethod")}
          </p>
          <div
            className={cn(
              "rounded-2xl transition-opacity",
              busy && "pointer-events-none opacity-60"
            )}
          >
            <ToggleGroup
              type="single"
              value={kind}
              onValueChange={(v) => {
                if (v && !busy) {
                  const next = v as AuthKind
                  setKind(next)
                  if (next !== "password") {
                    setShowPassword(false)
                    setCapsWarning(false)
                  }
                }
              }}
              variant="outline"
              spacing={0}
              className="flex w-full"
            >
              <ToggleGroupItem
                value="password"
                aria-label={tm("ariaPassword")}
                className="min-w-0 flex-1 px-2 text-xs sm:text-sm"
              >
                {tm("togglePassword")}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="otp"
                aria-label={tm("ariaOtp")}
                className="min-w-0 flex-1 px-2 text-xs sm:text-sm"
              >
                {tm("toggleOtp")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </section>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "sign-up" && kind === "password" ? (
          <div className="space-y-2">
            <Label htmlFor={`name-${mode}`}>{tm("labelName")}</Label>
            <Input
              id={`name-${mode}`}
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? authErrorDescId : undefined}
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor={`email-${mode}`}>{tm("labelEmail")}</Label>
          <Input
            id={`email-${mode}`}
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? authErrorDescId : undefined}
          />
        </div>
        {kind === "password" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`password-${mode}`}>{tm("labelPassword")}</Label>
              {mode === "sign-in" ? (
                <Link
                  href={"/forgot-password" as Route}
                  className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground"
                >
                  {tm("forgotPassword")}
                </Link>
              ) : null}
            </div>
            <div className="relative">
              <Input
                id={`password-${mode}`}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "sign-in" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.getModifierState("CapsLock")) setCapsWarning(true)
                }}
                onKeyUp={(e) => {
                  setCapsWarning(e.getModifierState("CapsLock"))
                }}
                required
                minLength={8}
                className="pe-10"
                aria-invalid={passwordInvalid}
                aria-describedby={passwordAriaDescribedByAttr}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute end-1 top-1/2 z-10 size-9 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? tm("ariaHidePassword") : tm("ariaShowPassword")
                }
                aria-pressed={showPassword}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOffIcon className="size-4" aria-hidden />
                ) : (
                  <EyeIcon className="size-4" aria-hidden />
                )}
              </Button>
            </div>
            {capsWarning ? (
              <p
                className="text-xs text-amber-600 dark:text-amber-500"
                role="status"
              >
                {tm("capsLockOn")}
              </p>
            ) : null}
            {mode === "sign-up" ? (
              <p id={passwordReqsId} className="text-xs text-muted-foreground">
                {tm("passwordRequirements")}
              </p>
            ) : null}
          </div>
        ) : null}
        {kind === "otp" && mode === "sign-up" ? (
          <div className="space-y-2">
            <Label htmlFor={`name-otp-${mode}`}>{tm("labelName")}</Label>
            <Input
              id={`name-otp-${mode}`}
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? authErrorDescId : undefined}
            />
          </div>
        ) : null}
        {kind === "otp" && info ? (
          <div className="space-y-2">
            <Label htmlFor={`otp-${mode}`}>{tm("labelOtp")}</Label>
            <InputOTP
              id={`otp-${mode}`}
              maxLength={6}
              inputMode="numeric"
              value={otp}
              onChange={setOtp}
              autoComplete="one-time-code"
              containerClassName="justify-center sm:justify-start"
              aria-invalid={otpInvalid}
              aria-describedby={otpInvalid ? authErrorDescId : undefined}
            >
              <InputOTPGroup
                className="gap-1.5"
                aria-label={tm("otpGroupAria")}
                aria-invalid={otpInvalid}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground">{tm("otpHint")}</p>
          </div>
        ) : null}

        {authError ? (
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertTitle>{tm("errorTitle")}</AlertTitle>
            <AlertDescription id={authErrorDescId}>
              {authError.message}
            </AlertDescription>
          </Alert>
        ) : null}
        {info && !authError ? (
          <Alert role="status" aria-live="polite">
            <AlertTitle>{tm("infoTitle")}</AlertTitle>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        ) : null}

        <Button type="submit" className="w-full" disabled={busy}>
          <SubmitLabel
            busy={pending === "form"}
            waitingLabel={tm("pleaseWait")}
            idle={
              kind === "otp"
                ? otp.trim()
                  ? tm("submitOtpVerify")
                  : tm("submitOtpSend")
                : mode === "sign-in"
                  ? tm("submitSignIn")
                  : tm("submitCreateAccount")
            }
          />
        </Button>
      </form>
    </>
  )
}
