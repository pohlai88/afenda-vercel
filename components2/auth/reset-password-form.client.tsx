"use client"

import { LockIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "#i18n/navigation"
import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"

import { authClient } from "#lib/auth-client"
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

function ResetPasswordForm() {
  const t = useTranslations("Auth")
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError(t("resetMissingToken"))
      return
    }
    if (password !== confirmPassword) {
      setError(t("resetPasswordMismatch"))
      return
    }
    if (password.length < 8) {
      setError(t("resetPasswordTooShort"))
      return
    }
    setPending(true)
    try {
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (err) {
        setError(err.message ?? t("resetPasswordFailed"))
        return
      }
      router.push("/sign-in")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full border-border/80 shadow-elevation-1">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <LockIcon
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          {t("titleResetPassword")}
        </CardTitle>
        <CardDescription>{t("resetPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t("resetPasswordNewLabel")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              {t("resetPasswordConfirmLabel")}
            </Label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("resetPasswordHint")}</p>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("resetPasswordErrorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? <Spinner className="size-4" /> : null}
              {pending ? t("resetPasswordUpdating") : t("resetPasswordSubmit")}
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

export function ResetPasswordSection() {
  const t = useTranslations("Auth")

  return (
    <Suspense
      fallback={
        <Card className="w-full border-border/80 shadow-elevation-1">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">
              {t("resetPasswordLoading")}
            </p>
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
