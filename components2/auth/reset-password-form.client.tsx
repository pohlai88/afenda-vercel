"use client"

import { LockIcon } from "lucide-react"
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
      setError("Missing reset token. Open the link from your email again.")
      return
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setPending(true)
    try {
      const { error: err } = await authClient.resetPassword({
        newPassword: password,
        token,
      })
      if (err) {
        setError(err.message ?? "Reset failed")
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
          Set a new password
        </CardTitle>
        <CardDescription>
          Choose a strong password you have not used here before.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
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
            <Label htmlFor="confirm-password">Confirm password</Label>
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
          <p className="text-xs text-muted-foreground">
            Use at least 8 characters. You will sign in again after updating.
          </p>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Could not reset</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? <Spinner className="size-4" /> : null}
              {pending ? "Updating…" : "Update password"}
            </span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <AuthFooterLinks>
          <AuthFooterLink href="/sign-in">Back to sign in</AuthFooterLink>
        </AuthFooterLinks>
      </CardFooter>
    </Card>
  )
}

export function ResetPasswordSection() {
  return (
    <Suspense
      fallback={
        <Card className="w-full border-border/80 shadow-elevation-1">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
            <Spinner className="size-8" />
            <p className="text-sm text-muted-foreground">Loading reset form…</p>
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
