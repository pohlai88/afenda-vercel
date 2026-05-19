"use client"

import { MailIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"

import { authClient } from "#lib/auth-client"
import { ensureAppLocale, toLocalePath } from "#lib/i18n/locales.shared"
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
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"

export function ForgotPasswordForm() {
  const t = useTranslations("Auth")
  const locale = ensureAppLocale(useLocale())
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setPending(true)
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error: err } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${origin}${toLocalePath(locale, "/reset-password")}`,
      })
      if (err) {
        setError(err.message ?? t("forgotPasswordRequestFailed"))
        return
      }
      setMessage(t("forgotPasswordSuccessMessage"))
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full border-border/80 shadow-elevation-1">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <MailIcon
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          {t("forgotPassword")}
        </CardTitle>
        <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("labelEmail")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("forgotPasswordRequestFailed")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {message ? (
            <Alert role="status" aria-live="polite">
              <AlertTitle>{t("forgotPasswordCheckEmailTitle")}</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? <Spinner className="size-4" /> : null}
              {pending ? t("forgotPasswordSending") : t("forgotPasswordSend")}
            </span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <AuthFooterLinks>
          <AuthFooterLink href="/sign-in">{t("backToSignIn")}</AuthFooterLink>
        </AuthFooterLinks>
      </CardFooter>
    </Card>
  )
}
