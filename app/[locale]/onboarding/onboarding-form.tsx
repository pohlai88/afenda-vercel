"use client"

import { Building2Icon } from "lucide-react"
import { useState } from "react"
import { Link, useRouter } from "#i18n/navigation"

import { authClient } from "#lib/auth-client"
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

export function OnboardingForm() {
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
    <Card className="w-full border-border/80 shadow-elevation-1">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle className="flex items-center gap-2 text-xl tracking-tight">
          <Building2Icon
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          Create your organization
        </CardTitle>
        <CardDescription>
          Multi-tenant ERP — this becomes your active organization for the
          dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, and hyphens. Leave blank to derive
              from the name.
            </p>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? <Spinner className="size-4" /> : null}
              {pending ? "Creating…" : "Continue to dashboard"}
            </span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="border-t pt-6">
        <p className="w-full text-center text-xs text-muted-foreground">
          <Link
            href="/"
            className="font-medium underline-offset-4 hover:text-foreground"
          >
            Back to home
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
