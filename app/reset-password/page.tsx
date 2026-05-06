"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError("Missing reset token. Open the link from your email again.")
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
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : "Update password"}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set a new password
        </h1>
        <p className="text-muted-foreground text-sm">
          Choose a strong password you have not used here before.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-muted-foreground text-center text-sm">
        <Link href="/sign-in" className="underline">
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
