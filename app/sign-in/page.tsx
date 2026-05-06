"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
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
          ERP demo — email and password via Better Auth.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "sign-up" ? (
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
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
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
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Sign up"}
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
        <Link href="/" className="underline">
          Home
        </Link>
      </p>
    </div>
  )
}
