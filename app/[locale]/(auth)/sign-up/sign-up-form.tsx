"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useActionState, useState } from "react"

import { AuthFooterLink } from "#components/auth/auth-footer-links"
import { AuthLegalConsent } from "#components/auth/auth-legal-consent"
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
  const [showPassword, setShowPassword] = useState(false)

  return (
    <AuthPageFrame>
      <Card className="w-full border-border/80 shadow-elevation-1">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl tracking-tight">
            Create account
          </CardTitle>
          <CardDescription>
            Fill in your details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <div className="relative">
                <Input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="pe-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute end-1 top-1/2 z-10 size-9 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
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
              <p className="text-xs text-muted-foreground">
                At least 8 characters.
              </p>
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
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t pt-6">
          <AuthLegalConsent />
          <p className="w-full text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <AuthFooterLink href="/sign-in">Sign in</AuthFooterLink>
          </p>
        </CardFooter>
      </Card>
    </AuthPageFrame>
  )
}
