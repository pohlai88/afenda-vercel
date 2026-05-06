"use client"

import { useState } from "react"
import Link from "next/link"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

export default function ForgotPasswordPage() {
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
      const origin =
        typeof window !== "undefined" ? window.location.origin : ""
      const { error: err } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${origin}/reset-password`,
      })
      if (err) {
        setError(err.message ?? "Request failed")
        return
      }
      setMessage("If an account exists for that email, a reset link was sent.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot password
        </h1>
        <p className="text-muted-foreground text-sm">
          We will email you a reset link if the address is registered.
        </p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
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
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-muted-foreground text-sm" role="status">
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
