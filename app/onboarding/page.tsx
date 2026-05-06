"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { authClient } from "#lib/auth-client"
import { Button } from "#components/ui/button"
import { Input } from "#components/ui/input"
import { Label } from "#components/ui/label"

export default function OnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState("")
  const [slug, setSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const { error: err } = await authClient.organization.create({
        name: orgName,
        slug: slug || orgName.toLowerCase().replace(/\s+/g, "-"),
      })
      if (err) {
        setError(err.message ?? "Could not create organization")
        return
      }
      router.push("/dashboard")
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-sm flex-col justify-center gap-6 px-4">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your organization
        </h1>
        <p className="text-muted-foreground text-sm">
          Multi-tenant ERP — this becomes your active org.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Organization name</Label>
          <Input
            id="orgName"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">URL slug</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-corp"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <p className="text-muted-foreground text-xs">
            Lowercase letters, numbers, and hyphens. Leave blank to derive from
            name.
          </p>
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Creating…" : "Continue"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/" className="text-muted-foreground underline">
          Back to home
        </Link>
      </p>
    </div>
  )
}
