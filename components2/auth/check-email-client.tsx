"use client"

import { MailCheckIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import {
  AUTH_CLIENT_ERROR_CODE,
  normalizeAuthClientError,
} from "#lib/auth-client"
import { neonAuthClient } from "#lib/auth/neon-auth-client-runtime.shared"
import {
  AuthFooterLink,
  AuthFooterLinks,
} from "#components2/auth/auth-footer-links"
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
import { Link } from "#i18n/navigation"
import { Spinner } from "#components2/ui/spinner"

export function CheckEmailClient({
  email,
  verifyHref,
}: {
  email?: string
  verifyHref: string
}) {
  const t = useTranslations()
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function resend() {
    if (!email || pending) return
    setError(null)
    setMessage(null)
    setPending(true)
    try {
      const result = await neonAuthClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      })
      if (result.error) {
        setError(normalizeAuthClientError(result.error.message).message)
        return
      }
      setMessage(t("CheckEmail.resendSuccess", { email }))
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
    <Card className="w-full border-border/80 shadow-elevation-1">
      <CardHeader className="space-y-2 pb-4">
        <div className="mb-1 flex size-10 items-center justify-center rounded-full bg-primary/10">
          <MailCheckIcon className="size-5 text-primary" aria-hidden />
        </div>
        <CardTitle className="text-xl tracking-tight">
          {t("CheckEmail.title")}
        </CardTitle>
        <CardDescription>
          {email
            ? t("CheckEmail.descriptionWithEmail", { email })
            : t("CheckEmail.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button asChild className="w-full">
          <Link href={verifyHref}>{t("CheckEmail.ctaVerify")}</Link>
        </Button>
        {email ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void resend()}
            disabled={pending}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? <Spinner className="size-4" /> : null}
              {pending
                ? t("CheckEmail.ctaResending")
                : t("CheckEmail.ctaResend")}
            </span>
          </Button>
        ) : null}
        {error ? (
          <Alert variant="destructive" role="alert" aria-live="assertive">
            <AlertTitle>{t("CheckEmail.errorTitle")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {message ? (
          <Alert role="status" aria-live="polite">
            <AlertTitle>{t("CheckEmail.resendTitle")}</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
      <CardFooter className="border-t pt-6">
        <AuthFooterLinks>
          <AuthFooterLink href="/sign-in">
            {t("CheckEmail.backToSignIn")}
          </AuthFooterLink>
        </AuthFooterLinks>
      </CardFooter>
    </Card>
  )
}
