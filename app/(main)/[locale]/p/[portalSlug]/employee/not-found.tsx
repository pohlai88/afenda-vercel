"use client"

import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { Button } from "#components/ui/button"
import { Link } from "#i18n/navigation"
import { employeePortalPath } from "#lib/portal"

/**
 * Employee portal segment 404 — invalid section slug or missing subject binding.
 */
export default function EmployeePortalNotFound() {
  const t = useTranslations("Portal.Employee")
  const params = useParams<{
    portalSlug?: string | string[]
    locale?: string
  }>()
  const portalSlugParam = params?.portalSlug
  const portalSlug =
    typeof portalSlugParam === "string"
      ? portalSlugParam
      : Array.isArray(portalSlugParam)
        ? portalSlugParam[0]
        : undefined

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-lg font-medium text-foreground">
          {t("notFoundTitle")}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {t("notFoundDescription")}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {portalSlug ? (
          <Button asChild variant="outline" size="sm">
            <Link
              href={employeePortalPath(portalSlug, "leave")}
              prefetch={false}
            >
              {t("backToLeave")}
            </Link>
          </Button>
        ) : null}
        <Button asChild variant="ghost" size="sm">
          <Link href="/sign-in" prefetch={false}>
            {t("signIn")}
          </Link>
        </Button>
      </div>
    </div>
  )
}
