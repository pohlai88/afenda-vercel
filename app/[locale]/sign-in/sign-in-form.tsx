"use client"

import type { Route } from "next"
import { EyeIcon, EyeOffIcon, KeyRoundIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useId, useState } from "react"
import { Link, useRouter } from "#i18n/navigation"

import {
  AUTH_CLIENT_ERROR_CODE,
  authClient,
  normalizeAuthClientError,
  type NormalizedAuthClientError,
} from "#lib/auth-client"
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components/ui/card"
import { Input } from "#components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "#components/ui/input-otp"
import { Label } from "#components/ui/label"
import { Separator } from "#components/ui/separator"
import { Spinner } from "#components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "#components/ui/toggle-group"
import { cn } from "#lib/utils"

type Mode = "sign-in" | "sign-up"
type AuthKind = "password" | "magic" | "otp"

type AuthActionPending =
  | null
  | "form"
  | "oauth-google"
  | "oauth-github"
  | "passkey"

function SubmitLabel({
  busy,
  idle,
  waitingLabel,
}: {
  busy: boolean
  idle: React.ReactNode
  waitingLabel: string
}) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      {busy ? <Spinner className="size-4" /> : null}
      {busy ? waitingLabel : idle}
    </span>
  )
}

export function SignInForm({
  postAuthPath,
  stepUp = false,
  initialEmail,
  enabledSocialProviders,
}: {
  postAuthPath: string
  stepUp?: boolean
  /** Optional sign-in page `?email=` prefill (e.g. dev shortcuts). */
  initialEmail?: string
  enabledSocialProviders: string[]
}) {
  const t = useTranslations("Auth")
  const router = useRouter()
  const authErrorRegionId = useId()
  const authErrorDescId = `${authErrorRegionId}-desc`
  const [email, setEmail] = useState(initialEmail ?? "")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [mode, setMode] = useState<Mode>("sign-in")
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
    router.push(postAuthPath as Route)
    router.refresh()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    setInfo(null)
    setPending("form")
    try {
      if (kind === "magic") {
        const { error: err } = await authClient.signIn.magicLink({
          email,
          callbackURL: postAuthPath,
        })
        if (err) {
          setAuthError(normalizeAuthClientError(err.message))
          return
        }
        setInfo("Check your email for the sign-in link.")
        return
      }
      if (kind === "otp") {
        if (otp.trim()) {
          if (mode === "sign-up") {
            const { error: err } = await authClient.signIn.emailOtp({
              email,
              otp: otp.trim(),
              name: name.trim() || (email.split("@")[0] ?? "User"),
            })
            if (err) {
              setAuthError(normalizeAuthClientError(err.message))
              return
            }
          } else {
            const { error: err } = await authClient.signIn.emailOtp({
              email,
              otp: otp.trim(),
            })
            if (err) {
              setAuthError(normalizeAuthClientError(err.message))
              return
            }
          }
          goPostAuth()
          return
        }
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({
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
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: postAuthPath,
        })
        if (err) {
          setAuthError(normalizeAuthClientError(err.message))
          return
        }
      } else {
        const { error: err } = await authClient.signIn.email({
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
    } finally {
      setPending(null)
    }
  }

  async function onOAuth(provider: "google" | "github") {
    setAuthError(null)
    setInfo(null)
    setPending(provider === "google" ? "oauth-google" : "oauth-github")
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: postAuthPath,
      })
    } finally {
      setPending(null)
    }
  }

  async function onPasskey() {
    setAuthError(null)
    setInfo(null)
    setPending("passkey")
    try {
      await authClient.signIn.passkey({
        autoFill: false,
        fetchOptions: {
          onSuccess: () => {
            goPostAuth()
          },
        },
      })
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
              onPasskey={onPasskey}
            />
          </TabsContent>
          <TabsContent value="sign-up" className="mt-4 space-y-6 outline-none">
            <AuthMethodPanels
              kind={kind}
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
              onPasskey={onPasskey}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 border-t pt-6">
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
  onPasskey,
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
  onPasskey: () => void | Promise<void>
}) {
  const tm = useTranslations("Auth")
  const hasSocial = enabledSocialProviders.length > 0
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
      <section aria-label={tm("ariaSsoSection")} className="space-y-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {hasSocial
            ? tm("ssoSectionLabelSocial")
            : tm("ssoSectionLabelPasskey")}
        </p>
        {hasSocial ? (
          <>
            <div className="flex flex-col gap-2">
              {enabledSocialProviders.includes("google") ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void onOAuth("google")}
                >
                  <SubmitLabel
                    busy={pending === "oauth-google"}
                    idle={tm("oauthGoogle")}
                    waitingLabel={tm("pleaseWait")}
                  />
                </Button>
              ) : null}
              {enabledSocialProviders.includes("github") ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void onOAuth("github")}
                >
                  <SubmitLabel
                    busy={pending === "oauth-github"}
                    idle={tm("oauthGithub")}
                    waitingLabel={tm("pleaseWait")}
                  />
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() => void onPasskey()}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {pending === "passkey" ? (
                    <Spinner className="size-4" />
                  ) : (
                    <KeyRoundIcon className="size-4" aria-hidden />
                  )}
                  {pending === "passkey"
                    ? tm("passkeyWaiting")
                    : tm("passkeySignIn")}
                </span>
              </Button>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              <span className="shrink-0">{tm("separatorOrEmail")}</span>
              <Separator className="flex-1" />
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void onPasskey()}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {pending === "passkey" ? (
                  <Spinner className="size-4" />
                ) : (
                  <KeyRoundIcon className="size-4" aria-hidden />
                )}
                {pending === "passkey"
                  ? tm("passkeyWaiting")
                  : tm("passkeySignIn")}
              </span>
            </Button>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Separator className="flex-1" />
              <span className="shrink-0">{tm("separatorOrEmail")}</span>
              <Separator className="flex-1" />
            </div>
          </div>
        )}
      </section>

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
              value="magic"
              aria-label={tm("ariaMagic")}
              className="min-w-0 flex-1 px-2 text-xs sm:text-sm"
            >
              {tm("toggleMagic")}
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
              kind === "magic"
                ? tm("submitMagic")
                : kind === "otp"
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
