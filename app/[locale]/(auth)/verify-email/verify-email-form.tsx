"use client"

import { useActionState } from "react"

import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
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

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">Verify email</h1>
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
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="verify-otp">Verification code</Label>
          <Input
            id="verify-otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="123456"
          />
        </div>
        {state?.error ? (
          <Alert variant="destructive">
            <AlertTitle>Verification failed</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          <span className="inline-flex items-center justify-center gap-2">
            {pending ? <Spinner className="size-4" /> : null}
            {pending ? "Verifying…" : "Verify and continue"}
          </span>
        </Button>
      </form>
    </main>
  )
}
