"use client"

import { useActionState, useId } from "react"

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

import { verifyEmailOtp } from "./actions"

type VerifyEmailState = { error: string } | null

export function VerifyEmailForm({ locale }: { locale: string }) {
  const boundAction = verifyEmailOtp.bind(null, locale)
  const [state, formAction, pending] = useActionState<
    VerifyEmailState,
    FormData
  >(boundAction, null)
  const errorId = useId()

  return (
    <AuthPageFrame>
      <Card className="w-full border-border/80 shadow-elevation-1">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl tracking-tight">Verify email</CardTitle>
          <CardDescription>
            Enter your email and the 6-digit code we sent to your inbox.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email">Email</Label>
              <Input
                id="verify-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                aria-invalid={Boolean(state?.error)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-otp">Verification code</Label>
              <InputOTP
                id="verify-otp"
                name="otp"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                containerClassName="justify-center sm:justify-start"
                aria-invalid={Boolean(state?.error)}
                aria-describedby={state?.error ? errorId : undefined}
              >
                <InputOTPGroup
                  className="gap-1.5"
                  aria-label="Verification code"
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">
                Check your inbox — the code expires soon.
              </p>
            </div>
            {state?.error ? (
              <Alert variant="destructive" role="alert" aria-live="assertive">
                <AlertTitle>Verification failed</AlertTitle>
                <AlertDescription id={errorId}>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending}>
              <span className="inline-flex items-center justify-center gap-2">
                {pending ? <Spinner className="size-4" /> : null}
                {pending ? "Verifying…" : "Verify and continue"}
              </span>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="border-t pt-6">
          <AuthFooterLinks>
            <AuthFooterLink href="/check-email">Resend code</AuthFooterLink>
            <AuthFooterLink href="/sign-in">Back to sign in</AuthFooterLink>
          </AuthFooterLinks>
        </CardFooter>
      </Card>
    </AuthPageFrame>
  )
}
