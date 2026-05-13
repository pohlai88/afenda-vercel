"use client"

import { useId, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "#i18n/navigation"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
} from "#lib/auth-client"
import { neonAuthClient } from "#lib/auth-client-neon-compat"
import {
  AuthFooterLink,
  AuthFooterLinks,
} from "#components/auth/auth-footer-links"
import { AuthPageFrame } from "#components/auth/auth-page-frame"
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
import { Spinner } from "#components/ui/spinner"

import {
  authResponseHasSessionToken,
  buildCheckEmailHref,
  localeAwarePathToClientRoute,
} from "../auth-flow.shared"

type VerifyEmailFormProps = {
  initialEmail?: string
  postAuthPath: string
}

export function VerifyEmailForm({
  initialEmail,
  postAuthPath,
}: VerifyEmailFormProps) {
  const t = useTranslations("VerifyEmail")
  const router = useRouter()
  const errorId = useId()
  const [email, setEmail] = useState(initialEmail ?? "")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const verify = await neonAuthClient.emailOtp.verifyEmail({ email, otp })
      if (verify.error) {
        setError(normalizeAuthClientError(verify.error.message).message)
        return
      }

      if (!authResponseHasSessionToken(verify)) {
        const signIn = await neonAuthClient.signIn.emailOtp({ email, otp })
        if (signIn.error) {
          setError(normalizeAuthClientError(signIn.error.message).message)
          return
        }
      }

      router.push(localeAwarePathToClientRoute(postAuthPath))
      router.refresh()
    } catch (caught: unknown) {
      const message =
        caught instanceof Error
          ? caught.message
          : AUTH_CLIENT_ERROR_CODE.UNKNOWN
      setError(normalizeAuthClientError(message).message)
    } finally {
      setPending(false)
    }
  }

  return (
    <AuthPageFrame>
      <Card className="w-full border-border/80 shadow-elevation-1">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl tracking-tight">{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email">{t("emailLabel")}</Label>
              <Input
                id="verify-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder={t("emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={Boolean(error)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-otp">{t("otpLabel")}</Label>
              <InputOTP
                id="verify-otp"
                name="otp"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                containerClassName="justify-center sm:justify-start"
                value={otp}
                onChange={setOtp}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              >
                <InputOTPGroup
                  className="gap-1.5"
                  aria-label={t("otpGroupAria")}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">{t("otpHint")}</p>
            </div>
            {error ? (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertTitle>{t("errorTitle")}</AlertTitle>
                <AlertDescription id={errorId}>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              <span className="inline-flex items-center justify-center gap-2">
                {pending ? <Spinner className="size-4" /> : null}
                {pending ? t("submitPending") : t("submit")}
              </span>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <AuthFooterLinks>
            <AuthFooterLink
              href={buildCheckEmailHref({
                email,
                callbackUrl: postAuthPath,
              })}
            >
              {t("resend")}
            </AuthFooterLink>
            <AuthFooterLink href="/sign-in">{t("backToSignIn")}</AuthFooterLink>
          </AuthFooterLinks>
        </CardFooter>
      </Card>
    </AuthPageFrame>
  )
}
