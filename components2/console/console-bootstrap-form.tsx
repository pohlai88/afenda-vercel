"use client"

import { Building2Icon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useState } from "react"

import { Link, useRouter } from "#i18n/navigation"

import type { PrepareOrgSlugState } from "#features/org-admin/client"
import { authClient } from "#lib/auth-client"
import { Alert, AlertDescription, AlertTitle } from "#components2/ui/alert"
import { Button } from "#components2/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "#components2/ui/card"
import { Input } from "#components2/ui/input"
import { Label } from "#components2/ui/label"
import { Spinner } from "#components2/ui/spinner"

type PrepareSlugAction = (input: {
  organizationName: string
  preferredSlug: string | null
}) => Promise<PrepareOrgSlugState>

export function ConsoleBootstrapForm({
  prepareSlugAction,
}: {
  prepareSlugAction: PrepareSlugAction
}) {
  const router = useRouter()
  const t = useTranslations("Console.bootstrap.form")
  const [orgName, setOrgName] = useState("")
  const [slug, setSlug] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const prepared = await prepareSlugAction({
        organizationName: orgName,
        preferredSlug: slug.trim() ? slug.trim() : null,
      })
      if (!prepared.ok) {
        setError(prepared.error)
        return
      }
      if (prepared.adjusted) {
        setSlug(prepared.slug)
      }
      const { error: err } = await authClient.organization.create({
        name: orgName,
        slug: prepared.slug,
      })
      if (err) {
        setError(err.message ?? t("createFailed"))
        return
      }
      router.push("/o")
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
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="console-org-name">{t("orgNameLabel")}</Label>
            <Input
              id="console-org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="console-org-slug">{t("slugLabel")}</Label>
            <Input
              id="console-org-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("slugPlaceholder")}
              pattern="[a-z0-9]+(?:[-_][a-z0-9]+)*"
            />
            <p className="text-xs text-muted-foreground">{t("slugRules")}</p>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertTitle>{t("errorTitle")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            <span className="inline-flex items-center justify-center gap-2">
              {pending ? <Spinner className="size-4" /> : null}
              {pending ? t("submitPending") : t("submit")}
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
            {t("backHome")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
