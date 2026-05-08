"use client"

import { useActionState } from "react"

import { Link } from "#i18n/navigation"
import { Alert, AlertDescription, AlertTitle } from "#components/ui/alert"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"
import { Spinner } from "#components/ui/spinner"

import { signUpWithEmail } from "./actions"

type SignUpState = { error: string } | null

export function SignUpForm({ locale }: { locale: string }) {
  const boundAction = signUpWithEmail.bind(null, locale)
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(
    boundAction,
    null
  )

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center gap-4 px-4">
      <h1 className="text-2xl font-semibold text-foreground">Create account</h1>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signup-name">Your name</Label>
          <Input
            id="signup-name"
            name="name"
            autoComplete="name"
            required
            placeholder="Your name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>
        {state?.error ? (
          <Alert variant="destructive">
            <AlertTitle>Could not create account</AlertTitle>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          <span className="inline-flex items-center justify-center gap-2">
            {pending ? <Spinner className="size-4" /> : null}
            {pending ? "Creating…" : "Create account"}
          </span>
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </main>
  )
}
