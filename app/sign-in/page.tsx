"use client"

import type { Route } from "next"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

type Mode = "sign-in" | "sign-up"
type AuthKind = "password" | "magic" | "otp"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [otp, setOtp] = useState("")
  const [mode, setMode] = useState<Mode>("sign-in")
  const [kind, setKind] = useState<AuthKind>("password")
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setPending(true)
    try {
      if (kind === "magic") {
        const { error: err } = await authClient.signIn.magicLink({
          email,
          callbackURL: "/onboarding",
        })
        if (err) {
          setError(err.message ?? "Could not send link")
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
              setError(err.message ?? "Invalid code")
              return
            }
          } else {
            const { error: err } = await authClient.signIn.emailOtp({
              email,
              otp: otp.trim(),
            })
            if (err) {
              setError(err.message ?? "Invalid code")
              return
            }
          }
          router.push("/onboarding")
          router.refresh()
          return
        }
        const { error: err } = await authClient.emailOtp.sendVerificationOtp({
          email,
          type: "sign-in",
        })
        if (err) {
          setError(err.message ?? "Could not send code")
          return
        }
        setInfo("Enter the code we emailed you.")
        return
      }
      if (mode === "sign-up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name,
        })
        if (err) {
          setError(err.message ?? "Sign up failed")
          return
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
        })
        if (err) {
          setError(err.message ?? "Sign in failed")
          return
        }
      }
      router.push("/onboarding")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "sign-in" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Better Auth — password, magic link, OTP, OAuth, or passkey after
          sign-in.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={kind === "password" ? "default" : "outline"}
          onClick={() => {
            setKind("password")
            setInfo(null)
            setError(null)
          }}
        >
          Password
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "magic" ? "default" : "outline"}
          onClick={() => {
            setKind("magic")
            setInfo(null)
            setError(null)
          }}
        >
          Magic link
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "otp" ? "default" : "outline"}
          onClick={() => {
            setKind("otp")
            setOtp("")
            setInfo(null)
            setError(null)
          }}
        >
          Email code
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() =>
            void authClient.signIn.social({
              provider: "github",
              callbackURL: "/onboarding",
            })
          }
        >
          Continue with GitHub
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() =>
            void authClient.signIn.social({
              provider: "google",
              callbackURL: "/onboarding",
            })
          }
        >
          Continue with Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={pending}
          onClick={() =>
            void authClient.signIn.passkey({
              autoFill: false,
              fetchOptions: {
                onSuccess: () => {
                  router.push("/onboarding")
                  router.refresh()
                },
              },
            })
          }
        >
          Sign in with passkey
        </Button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "sign-up" && kind === "password" ? (
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
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
        {kind === "password" ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              {mode === "sign-in" ? (
                <Link
                  href={"/forgot-password" as Route}
                  className="text-muted-foreground text-xs underline"
                >
                  Forgot?
                </Link>
              ) : null}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "sign-in" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
        ) : null}
        {kind === "otp" && mode === "sign-up" ? (
          <div className="space-y-2">
            <Label htmlFor="name-otp">Name</Label>
            <Input
              id="name-otp"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        ) : null}
        {kind === "otp" && info ? (
          <div className="space-y-2">
            <Label htmlFor="otp">One-time code</Label>
            <Input
              id="otp"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
        ) : null}
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {info ? (
          <p className="text-muted-foreground text-sm" role="status">
            {info}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending
            ? "Please wait…"
            : kind === "magic"
              ? "Email magic link"
              : kind === "otp"
                ? otp.trim()
                  ? "Verify code"
                  : "Send code"
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {mode === "sign-in" ? (
          <>
            No account?{" "}
            <button
              type="button"
              className="text-foreground underline"
              onClick={() => setMode("sign-up")}
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already registered?{" "}
            <button
              type="button"
              className="text-foreground underline"
              onClick={() => setMode("sign-in")}
            >
              Sign in
            </button>
          </>
        )}
        {" · "}
        <Link href={"/account/security" as Route} className="underline">
          Security
        </Link>
        {" · "}
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </div>
  )
}
